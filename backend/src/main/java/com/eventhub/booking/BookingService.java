package com.eventhub.booking;

import com.eventhub.common.BadRequestException;
import com.eventhub.common.ConflictException;
import com.eventhub.common.NotFoundException;
import com.eventhub.common.Text;
import com.eventhub.event.Event;
import com.eventhub.event.EventRepository;
import com.eventhub.event.EventStatus;
import com.eventhub.event.SalesWindow;
import com.eventhub.event.SeatingMode;
import com.eventhub.event.TicketType;
import com.eventhub.event.TicketTypeRepository;
import com.eventhub.security.ActorVerifier;
import com.eventhub.user.User;
import com.eventhub.venue.Seat;
import com.eventhub.venue.SeatRepository;
import java.time.Instant;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class BookingService {

    private static final int MAX_TICKETS_PER_BOOKING = 20;
    private static final int MAX_ATTEMPTS = 3;
    private static final Pattern IDEMPOTENCY_KEY = Pattern.compile("^[A-Za-z0-9_-]{8,64}$");

    // Names of the database constraints we expect to hit in races (defined in V3).
    private static final String SEAT_CLAIM_INDEX = "ux_booking_seats_active_seat";
    private static final String IDEMPOTENCY_INDEX = "ux_bookings_idempotency";
    private static final String REFERENCE_CONSTRAINT = "ux_bookings_reference";

    private final TransactionTemplate transactions;
    private final ActorVerifier actors;
    private final EventRepository events;
    private final TicketTypeRepository ticketTypes;
    private final SeatRepository seats;
    private final BookingRepository bookings;
    private final BookingSeatRepository bookingSeats;
    private final BookingInventory inventory;
    private final BookingProperties properties;

    public BookingService(PlatformTransactionManager transactionManager, ActorVerifier actors,
                          EventRepository events, TicketTypeRepository ticketTypes, SeatRepository seats,
                          BookingRepository bookings, BookingSeatRepository bookingSeats,
                          BookingInventory inventory, BookingProperties properties) {
        this.transactions = new TransactionTemplate(transactionManager);
        this.actors = actors;
        this.events = events;
        this.ticketTypes = ticketTypes;
        this.seats = seats;
        this.bookings = bookings;
        this.bookingSeats = bookingSeats;
        this.inventory = inventory;
        this.properties = properties;
    }

    /**
     * Deliberately NOT @Transactional. The database work runs inside a transaction we control, so that
     * when the database refuses a duplicate (a race) we can decide what to do AFTER that transaction
     * has rolled back: report a conflict, replay the earlier booking, or retry with a new reference.
     */
    public BookingCreation create(long userId, CreateBookingRequest request, String idempotencyKey) {
        String key = Text.blankToNull(idempotencyKey);
        if (key != null && !IDEMPOTENCY_KEY.matcher(key).matches()) {
            throw new BadRequestException("Idempotency-Key must be 8-64 letters, digits, hyphens or underscores");
        }
        for (int attempt = 1; ; attempt++) {
            try {
                return transactions.execute(status -> createInTransaction(userId, request, key));
            } catch (DataIntegrityViolationException e) {
                String cause = String.valueOf(e.getMostSpecificCause().getMessage());
                if (cause.contains(SEAT_CLAIM_INDEX)) {
                    throw new ConflictException(
                            "Some of these seats were just taken by another customer. Please choose different seats.");
                }
                if (key != null && cause.contains(IDEMPOTENCY_INDEX)) {
                    // A simultaneous request with the same key won the race: return its booking.
                    return transactions.execute(status -> replayExisting(userId, request, key));
                }
                if (cause.contains(REFERENCE_CONSTRAINT) && attempt < MAX_ATTEMPTS) {
                    continue; // astronomically unlikely reference collision: try again with a new one
                }
                throw e;
            }
        }
    }

    private BookingCreation createInTransaction(long userId, CreateBookingRequest request, String key) {
        User user = actors.requireActive(userId);
        if (key != null) {
            Optional<Booking> existing = bookings.findByUserIdAndIdempotencyKey(userId, key);
            if (existing.isPresent()) {
                return replay(existing.get(), request);
            }
        }

        Instant now = Instant.now();
        // Drafts, cancelled and unknown events all look the same: not found.
        Event event = events.findByIdAndStatusForShare(request.eventId(), EventStatus.PUBLISHED)
                .orElseThrow(() -> new NotFoundException("Event not found"));
        if (!event.getStartsAt().isAfter(now)) {
            throw new ConflictException("This event has already started");
        }

        Booking booking = new Booking(user, event, BookingReference.generate(), now.plus(properties.holdDuration()));
        booking.setIdempotencyKey(key);
        if (event.getSeatingMode() == SeatingMode.GENERAL_ADMISSION) {
            addGeneralAdmissionLines(booking, event, request, now);
        } else {
            addSeatLines(booking, event, request, now);
        }
        bookings.saveAndFlush(booking);
        return new BookingCreation(BookingResponse.from(booking), true);
    }

    private void addGeneralAdmissionLines(Booking booking, Event event, CreateBookingRequest request, Instant now) {
        if (request.seatIds() != null && !request.seatIds().isEmpty()) {
            throw new BadRequestException("seatIds is only for reserved-seating events");
        }
        List<CreateBookingRequest.Item> items = request.items();
        if (items == null || items.isEmpty()) {
            throw new BadRequestException("Choose at least one ticket type");
        }
        Set<Long> distinctTypeIds = items.stream().map(CreateBookingRequest.Item::ticketTypeId)
                .collect(Collectors.toSet());
        if (distinctTypeIds.size() != items.size()) {
            throw new BadRequestException("Each ticket type may appear only once");
        }
        int totalTickets = items.stream().mapToInt(CreateBookingRequest.Item::quantity).sum();
        if (totalTickets > MAX_TICKETS_PER_BOOKING) {
            throw new BadRequestException("A booking can contain at most " + MAX_TICKETS_PER_BOOKING + " tickets");
        }

        Map<Long, TicketType> typesById = ticketTypes.findAllById(distinctTypeIds).stream()
                .collect(Collectors.toMap(TicketType::getId, type -> type));
        // Always claim in ticket-type id order so concurrent bookings lock rows in the same order (no deadlocks).
        List<CreateBookingRequest.Item> ordered = items.stream()
                .sorted(Comparator.comparing(CreateBookingRequest.Item::ticketTypeId))
                .toList();
        for (CreateBookingRequest.Item item : ordered) {
            TicketType type = typesById.get(item.ticketTypeId());
            if (type == null || !type.getEvent().getId().equals(event.getId())) {
                throw new BadRequestException("Unknown ticket type: " + item.ticketTypeId());
            }
            if (type.getQuantityTotal() == null) {
                throw new BadRequestException("'" + type.getName() + "' is a reserved-seating ticket");
            }
            if (!SalesWindow.isOpen(type, event, now)) {
                throw new ConflictException("Sales are not open for '" + type.getName() + "'");
            }
            if (item.quantity() > type.getMaxPerBooking()) {
                throw new BadRequestException("At most " + type.getMaxPerBooking()
                        + " tickets of '" + type.getName() + "' per booking");
            }
            // One atomic statement: succeeds only if enough tickets are left.
            if (ticketTypes.reserveQuantity(type.getId(), item.quantity()) == 0) {
                throw new ConflictException("Not enough '" + type.getName() + "' tickets left");
            }
            booking.addItem(type, item.quantity());
        }
    }

    private void addSeatLines(Booking booking, Event event, CreateBookingRequest request, Instant now) {
        if (request.items() != null && !request.items().isEmpty()) {
            throw new BadRequestException("items is only for general-admission events");
        }
        List<Long> seatIds = request.seatIds();
        if (seatIds == null || seatIds.isEmpty()) {
            throw new BadRequestException("Choose at least one seat");
        }
        if (new HashSet<>(seatIds).size() != seatIds.size()) {
            throw new BadRequestException("Each seat may appear only once");
        }

        // Only seats of THIS event's venue are accepted; anything else is "does not exist".
        List<Seat> found = seats.findByIdInAndVenueId(seatIds, event.getVenue().getId());
        if (found.size() != seatIds.size()) {
            throw new BadRequestException("One or more seats do not exist for this event");
        }
        List<Seat> ordered = found.stream().sorted(Comparator.comparing(Seat::getId)).toList();

        Map<String, TicketType> typeBySection = ticketTypes.findByEventIdOrderByIdAsc(event.getId()).stream()
                .filter(type -> type.getSeatSection() != null)
                .collect(Collectors.toMap(TicketType::getSeatSection, type -> type));
        Map<Long, TicketType> typeBySeat = new HashMap<>();
        Map<Long, Integer> seatsPerType = new HashMap<>();
        for (Seat seat : ordered) {
            TicketType type = typeBySection.get(seat.getSection());
            if (type == null) {
                throw new BadRequestException("Seat " + label(seat) + " is not for sale at this event");
            }
            if (!SalesWindow.isOpen(type, event, now)) {
                throw new ConflictException("Sales are not open for '" + type.getName() + "'");
            }
            typeBySeat.put(seat.getId(), type);
            seatsPerType.merge(type.getId(), 1, Integer::sum);
        }
        for (TicketType type : typeBySeat.values().stream().distinct().toList()) {
            if (seatsPerType.get(type.getId()) > type.getMaxPerBooking()) {
                throw new BadRequestException("At most " + type.getMaxPerBooking()
                        + " seats in '" + type.getName() + "' per booking");
            }
        }

        // Give back seats held by unpaid bookings whose time ran out, so they can be sold again.
        List<Booking> expiredHolds = bookings.findExpiredHoldsOnSeats(event.getId(), seatIds, now);
        for (Booking expired : expiredHolds) {
            expired.expire(now);
            inventory.releaseItems(expired);
        }
        if (!expiredHolds.isEmpty()) {
            bookings.flush(); // the releases must reach the database before we claim the seats
        }

        // Friendly check with seat names. The unique index in the database is the real guarantee.
        Set<Long> taken = new HashSet<>(bookingSeats.findActiveSeatIds(event.getId(), seatIds));
        if (!taken.isEmpty()) {
            String names = ordered.stream().filter(seat -> taken.contains(seat.getId()))
                    .map(BookingService::label).collect(Collectors.joining(", "));
            throw new ConflictException("These seats are no longer available: " + names);
        }

        for (Seat seat : ordered) {
            booking.addSeat(seat, typeBySeat.get(seat.getId()));
        }
    }

    private BookingCreation replayExisting(long userId, CreateBookingRequest request, String key) {
        Booking existing = bookings.findByUserIdAndIdempotencyKey(userId, key)
                .orElseThrow(() -> new IllegalStateException("Idempotent booking disappeared"));
        return replay(existing, request);
    }

    private BookingCreation replay(Booking existing, CreateBookingRequest request) {
        if (!sameRequest(existing, request)) {
            throw new ConflictException("This Idempotency-Key was already used for a different request");
        }
        return new BookingCreation(BookingResponse.from(existing), false);
    }

    private static boolean sameRequest(Booking booking, CreateBookingRequest request) {
        if (!booking.getEvent().getId().equals(request.eventId())) {
            return false;
        }
        Set<Long> bookedSeats = booking.getSeats().stream()
                .map(line -> line.getSeat().getId()).collect(Collectors.toSet());
        Set<Long> requestedSeats = request.seatIds() == null ? Set.of() : new HashSet<>(request.seatIds());
        Map<Long, Integer> bookedItems = booking.getItems().stream()
                .collect(Collectors.toMap(item -> item.getTicketType().getId(), BookingItem::getQuantity));
        Map<Long, Integer> requestedItems = request.items() == null ? Map.of() : request.items().stream()
                .collect(Collectors.toMap(CreateBookingRequest.Item::ticketTypeId,
                        CreateBookingRequest.Item::quantity, Integer::sum));
        return bookedSeats.equals(requestedSeats) && bookedItems.equals(requestedItems);
    }

    private static String label(Seat seat) {
        return seat.getSection() + " " + seat.getRowLabel() + seat.getSeatNumber();
    }
}