package com.eventhub.admin;

import com.eventhub.event.Event;
import com.eventhub.event.EventStatus;
import com.eventhub.event.SeatingMode;
import java.math.BigDecimal;
import java.time.Instant;

public record AdminEventResponse(Long id, String title, EventStatus status, SeatingMode seatingMode,
                                 Long organizerId, String organizerName, String venueName, String city,
                                 Instant startsAt, Instant endsAt, BigDecimal startingPrice, Instant createdAt) {

    /** Must be called inside a transaction (it reads lazily loaded relations). */
    public static AdminEventResponse from(Event event) {
        return new AdminEventResponse(event.getId(), event.getTitle(), event.getStatus(), event.getSeatingMode(),
                event.getOrganizer().getId(), event.getOrganizer().getFullName(),
                event.getVenue().getName(), event.getVenue().getCity(),
                event.getStartsAt(), event.getEndsAt(), event.getStartingPrice(), event.getCreatedAt());
    }
}