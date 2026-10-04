package com.eventhub.event;

import com.eventhub.common.BadRequestException;
import com.eventhub.common.ConflictException;
import com.eventhub.common.NotFoundException;
import com.eventhub.common.Text;
import com.eventhub.security.ActorVerifier;
import com.eventhub.user.Role;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TicketTypeService {

    private static final int DEFAULT_MAX_PER_BOOKING = 10;

    private final EventRepository events;
    private final TicketTypeRepository ticketTypes;
    private final ActorVerifier actors;

    public TicketTypeService(EventRepository events, TicketTypeRepository ticketTypes, ActorVerifier actors) {
        this.events = events;
        this.ticketTypes = ticketTypes;
        this.actors = actors;
    }

    @Transactional
    public TicketTypeResponse create(long organizerId, long eventId, CreateTicketTypeRequest request) {
        actors.requireRole(organizerId, Role.ORGANIZER);
        Event event = lockedDraftEvent(organizerId, eventId); // row lock: concurrent changes wait here
        String name = request.name().trim();
        String section = Text.blankToNull(request.seatSection());

        if (ticketTypes.existsByEventIdAndNameIgnoreCase(eventId, name)) {
            throw new ConflictException("A ticket type with this name already exists for the event");
        }
        if (request.salesEnd() != null && request.salesEnd().isAfter(event.getEndsAt())) {
            throw new BadRequestException("Ticket sales must close no later than the event ends");
        }

        int maxPerBooking = request.maxPerBooking() == null ? DEFAULT_MAX_PER_BOOKING : request.maxPerBooking();
        BigDecimal price = request.price().setScale(2, RoundingMode.UNNECESSARY); // validated: at most 2 decimals

        TicketType type;
        try {
            if (event.getSeatingMode() == SeatingMode.GENERAL_ADMISSION) {
                requireGeneralAdmissionShape(request, section);
                requireWithinVenueCapacity(event, request.quantityTotal());
                type = TicketType.generalAdmission(event, name, price, request.quantityTotal(),
                        maxPerBooking, request.salesStart(), request.salesEnd());
            } else {
                requireReservedSeatingShape(request, section);
                if (ticketTypes.existsByEventIdAndSeatSection(eventId, section)) {
                    throw new ConflictException("A ticket type for this section already exists for the event");
                }
                type = TicketType.reservedSection(event, name, price, section,
                        maxPerBooking, request.salesStart(), request.salesEnd());
            }
        } catch (IllegalArgumentException e) {
            throw new BadRequestException(e.getMessage());
        }
        return TicketTypeResponse.from(ticketTypes.save(type));
    }

    @Transactional(readOnly = true)
    public List<TicketTypeResponse> list(long organizerId, long eventId) {
        actors.requireRole(organizerId, Role.ORGANIZER);
        events.findByIdAndOrganizerId(eventId, organizerId)
                .orElseThrow(() -> new NotFoundException("Event not found"));
        return ticketTypes.findByEventIdOrderByIdAsc(eventId).stream()
                .map(TicketTypeResponse::from)
                .toList();
    }

    @Transactional
    public void delete(long organizerId, long eventId, long ticketTypeId) {
        actors.requireRole(organizerId, Role.ORGANIZER);
        lockedDraftEvent(organizerId, eventId);
        TicketType type = ticketTypes.findByIdAndEventId(ticketTypeId, eventId)
                .orElseThrow(() -> new NotFoundException("Ticket type not found"));
        ticketTypes.delete(type); // safe: a draft event cannot have bookings yet
    }

    private Event lockedDraftEvent(long organizerId, long eventId) {
        Event event = events.findByIdAndOrganizerIdForUpdate(eventId, organizerId)
                .orElseThrow(() -> new NotFoundException("Event not found"));
        if (event.getStatus() != EventStatus.DRAFT) {
            throw new ConflictException(
                    "Ticket types can only be changed while the event is a draft. Unpublish the event first.");
        }
        return event;
    }

    private static void requireGeneralAdmissionShape(CreateTicketTypeRequest request, String section) {
        if (request.quantityTotal() == null) {
            throw new BadRequestException("quantityTotal is required for general-admission events");
        }
        if (section != null) {
            throw new BadRequestException("seatSection is only for reserved-seating events");
        }
    }

    private static void requireReservedSeatingShape(CreateTicketTypeRequest request, String section) {
        if (section == null) {
            throw new BadRequestException("seatSection is required for reserved-seating events");
        }
        if (request.quantityTotal() != null) {
            throw new BadRequestException("quantityTotal is only for general-admission events");
        }
    }

    private void requireWithinVenueCapacity(Event event, int newQuantity) {
        long alreadyDefined = ticketTypes.sumQuantityTotalByEventId(event.getId());
        int capacity = event.getVenue().getCapacity();
        if (alreadyDefined + newQuantity > capacity) {
            throw new BadRequestException("Total tickets would exceed the venue capacity of " + capacity
                    + " (already defined: " + alreadyDefined + ")");
        }
    }
}