package com.eventhub.event;

import java.math.BigDecimal;
import java.time.Instant;

/** What an event card needs in the public list. */
public record EventSummaryResponse(Long id, String title, String category, String imageUrl,
                                   Instant startsAt, Instant endsAt, String venueName, String city,
                                   String timeZone, BigDecimal startingPrice, String currency) {

    public static EventSummaryResponse from(Event event) {
        return new EventSummaryResponse(event.getId(), event.getTitle(), event.getCategory(),
                event.getImageUrl(), event.getStartsAt(), event.getEndsAt(),
                event.getVenue().getName(), event.getVenue().getCity(), event.getVenue().getTimeZone(),
                event.getStartingPrice(), event.getCurrency());
    }
}