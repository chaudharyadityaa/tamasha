package com.eventhub.event;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/** The public event page. Deliberately excludes emails, sold counts and other internals. */
public record EventDetailResponse(Long id, String title, String description, String category,
                                  String imageUrl, Instant startsAt, Instant endsAt,
                                  SeatingMode seatingMode, String currency, int cancellationCutoffHours,
                                  String organizerName, VenueInfo venue,
                                  List<PublicTicketType> ticketTypes) {

    public record VenueInfo(String name, String addressLine, String city, String region,
                            String country, String timeZone) {
    }

    /** quantityRemaining is null for reserved-seating types (seat availability comes with bookings). */
    public record PublicTicketType(Long id, String name, BigDecimal price, Integer quantityRemaining,
                                   String seatSection, int maxPerBooking, Instant salesStart,
                                   Instant salesEnd, boolean onSale) {
    }
}