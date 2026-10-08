package com.eventhub.booking;

import com.eventhub.common.NotFoundException;
import com.eventhub.common.PageResponse;
import com.eventhub.event.Event;
import com.eventhub.event.EventRepository;
import com.eventhub.event.TicketType;
import com.eventhub.event.TicketTypeRepository;
import com.eventhub.security.ActorVerifier;
import com.eventhub.user.Role;
import com.eventhub.venue.SeatRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OrganizerBookingService {

    private static final int MAX_PAGE_SIZE = 50;

    private final ActorVerifier actors;
    private final EventRepository events;
    private final BookingRepository bookings;
    private final TicketTypeRepository ticketTypes;
    private final SeatRepository seats;

    public OrganizerBookingService(ActorVerifier actors, EventRepository events, BookingRepository bookings,
                                   TicketTypeRepository ticketTypes, SeatRepository seats) {
        this.actors = actors;
        this.events = events;
        this.bookings = bookings;
        this.ticketTypes = ticketTypes;
        this.seats = seats;
    }

    @Transactional(readOnly = true)
    public PageResponse<OrganizerBookingResponse> list(long organizerId, long eventId, int page, int size) {
        actors.requireRole(organizerId, Role.ORGANIZER);
        ownEvent(organizerId, eventId);
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), MAX_PAGE_SIZE),
                Sort.by(Sort.Direction.DESC, "createdAt").and(Sort.by(Sort.Direction.DESC, "id")));
        Instant now = Instant.now();
        return PageResponse.from(bookings.findByEventId(eventId, pageable)
                .map(booking -> OrganizerBookingResponse.from(booking, now)));
    }

    @Transactional(readOnly = true)
    public EventStatsResponse stats(long organizerId, long eventId) {
        actors.requireRole(organizerId, Role.ORGANIZER);
        Event event = ownEvent(organizerId, eventId);
        Instant now = Instant.now();

        Map<BookingStatus, Long> byStatus = new EnumMap<>(BookingStatus.class);
        for (BookingStatus status : BookingStatus.values()) {
            byStatus.put(status, 0L);
        }
        for (Object[] row : bookings.countByStatusForEvent(eventId)) {
            byStatus.put((BookingStatus) row[0], ((Number) row[1]).longValue());
        }

        BigDecimal revenue = bookings.sumConfirmedRevenue(eventId);
        if (revenue == null) {
            revenue = new BigDecimal("0.00");
        }

        // ticket type id -> {confirmed, held}
        Map<Long, long[]> usage = new HashMap<>();
        accumulate(usage, bookings.sumItemQuantities(eventId, now));
        accumulate(usage, bookings.countSeatClaims(eventId, now));

        Map<String, Long> seatsPerSection = seats.summarizeSections(event.getVenue().getId()).stream()
                .collect(Collectors.toMap(SeatRepository.SectionSummary::getSection,
                        SeatRepository.SectionSummary::getSeatCount));

        List<EventStatsResponse.TicketTypeStats> perType = new ArrayList<>();
        long totalCapacity = 0;
        long totalConfirmed = 0;
        long totalHeld = 0;
        for (TicketType type : ticketTypes.findByEventIdOrderByIdAsc(eventId)) {
            long capacity = type.getQuantityTotal() != null
                    ? type.getQuantityTotal()
                    : seatsPerSection.getOrDefault(type.getSeatSection(), 0L);
            long[] counts = usage.getOrDefault(type.getId(), new long[2]);
            long available = Math.max(capacity - counts[0] - counts[1], 0);
            perType.add(new EventStatsResponse.TicketTypeStats(type.getId(), type.getName(), type.getPrice(),
                    type.getSeatSection(), capacity, counts[0], counts[1], available));
            totalCapacity += capacity;
            totalConfirmed += counts[0];
            totalHeld += counts[1];
        }
        double occupancy = totalCapacity == 0
                ? 0.0
                : Math.round((totalConfirmed + totalHeld) * 1000.0 / totalCapacity) / 10.0;
        EventStatsResponse.Overall overall = new EventStatsResponse.Overall(totalCapacity, totalConfirmed,
                totalHeld, Math.max(totalCapacity - totalConfirmed - totalHeld, 0), occupancy);

        return new EventStatsResponse(eventId, event.getTitle(), event.getCurrency(), revenue,
                byStatus, overall, perType);
    }

    private static void accumulate(Map<Long, long[]> usage, List<Object[]> rows) {
        for (Object[] row : rows) {
            long[] counts = usage.computeIfAbsent((Long) row[0], id -> new long[2]);
            long amount = ((Number) row[2]).longValue();
            if (row[1] == BookingStatus.CONFIRMED) {
                counts[0] += amount;
            } else {
                counts[1] += amount;
            }
        }
    }

    private Event ownEvent(long organizerId, long eventId) {
        // Someone else's event looks exactly like one that does not exist.
        return events.findByIdAndOrganizerId(eventId, organizerId)
                .orElseThrow(() -> new NotFoundException("Event not found"));
    }
}