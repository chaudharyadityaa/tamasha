package com.eventhub.seating;

import com.eventhub.common.BadRequestException;
import com.eventhub.common.NotFoundException;
import com.eventhub.event.Event;
import com.eventhub.event.EventRepository;
import com.eventhub.event.EventStatus;
import com.eventhub.event.SalesWindow;
import com.eventhub.event.SeatingMode;
import com.eventhub.event.TicketType;
import com.eventhub.event.TicketTypeRepository;
import com.eventhub.venue.Seat;
import com.eventhub.venue.SeatRepository;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SeatMapService {

    /** Natural order: A, B, ..., Z, AA ... and 1, 2, ..., 10 (shorter labels first, then alphabetical). */
    private static final Comparator<String> LABEL_ORDER =
            Comparator.comparingInt(String::length).thenComparing(Comparator.naturalOrder());

    private static final Comparator<Seat> SEAT_ORDER =
            Comparator.comparing(Seat::getRowLabel, LABEL_ORDER).thenComparing(Seat::getSeatNumber, LABEL_ORDER);

    private final EventRepository events;
    private final TicketTypeRepository ticketTypes;
    private final SeatRepository seats;

    public SeatMapService(EventRepository events, TicketTypeRepository ticketTypes, SeatRepository seats) {
        this.events = events;
        this.ticketTypes = ticketTypes;
        this.seats = seats;
    }

    @Transactional(readOnly = true)
    public SeatMapResponse get(long eventId) {
        // Drafts and cancelled events look exactly like events that do not exist.
        Event event = events.findByIdAndStatus(eventId, EventStatus.PUBLISHED)
                .orElseThrow(() -> new NotFoundException("Event not found"));
        if (event.getSeatingMode() != SeatingMode.RESERVED_SEATING) {
            throw new BadRequestException("This event does not use reserved seating");
        }

        List<TicketType> types = ticketTypes.findByEventIdOrderByIdAsc(eventId);
        // Only sections that have a ticket type are for sale, so only those seats are shown.
        Set<String> sellableSections = types.stream().map(TicketType::getSeatSection).collect(Collectors.toSet());
        Map<String, List<Seat>> seatsBySection = sellableSections.isEmpty()
                ? Map.of()
                : seats.findByVenueIdAndSectionIn(event.getVenue().getId(), sellableSections).stream()
                        .collect(Collectors.groupingBy(Seat::getSection));

        Instant now = Instant.now();
        List<SeatMapResponse.Section> sections = types.stream()
                .map(type -> new SeatMapResponse.Section(
                        type.getId(), type.getName(), type.getSeatSection(), type.getPrice(),
                        SalesWindow.isOpen(type, event, now),
                        seatsBySection.getOrDefault(type.getSeatSection(), List.of()).stream()
                                .sorted(SEAT_ORDER)
                                .map(seat -> new SeatMapResponse.SeatView(
                                        seat.getId(), seat.getRowLabel(), seat.getSeatNumber(),
                                        SeatStatus.AVAILABLE)) // bookings will change this
                                .toList()))
                .toList();
        return new SeatMapResponse(eventId, event.getCurrency(), sections);
    }
}