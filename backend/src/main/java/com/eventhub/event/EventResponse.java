package com.eventhub.event;

import com.eventhub.venue.VenueResponse;
import java.time.Instant;

public record EventResponse(Long id, VenueResponse venue, String title, String description,
                            String category, String imageUrl, Instant startsAt, Instant endsAt,
                            SeatingMode seatingMode, EventStatus status, String currency,
                            int cancellationCutoffHours) {

    public static EventResponse from(Event event) {
        return new EventResponse(event.getId(), VenueResponse.from(event.getVenue()),
                event.getTitle(), event.getDescription(), event.getCategory(), event.getImageUrl(),
                event.getStartsAt(), event.getEndsAt(), event.getSeatingMode(), event.getStatus(),
                event.getCurrency(), event.getCancellationCutoffHours());
    }
}