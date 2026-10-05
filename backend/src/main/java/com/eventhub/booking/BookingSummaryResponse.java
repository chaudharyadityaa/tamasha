package com.eventhub.booking;

import java.math.BigDecimal;
import java.time.Instant;

/** One row in "My bookings". Deliberately light: no seat or ticket lines. */
public record BookingSummaryResponse(Long id, String reference, BookingStatus status, Long eventId,
                                     String eventTitle, Instant eventStartsAt, Instant eventEndsAt,
                                     String currency, BigDecimal totalAmount, Instant expiresAt,
                                     Instant createdAt) {

    public static BookingSummaryResponse from(Booking booking, Instant now) {
        // An unpaid hold that ran out shows as EXPIRED even if the sweeper has not marked it yet.
        BookingStatus shown = booking.getStatus() == BookingStatus.PENDING_PAYMENT
                && !now.isBefore(booking.getExpiresAt())
                ? BookingStatus.EXPIRED
                : booking.getStatus();
        return new BookingSummaryResponse(booking.getId(), booking.getReference(), shown,
                booking.getEvent().getId(), booking.getEvent().getTitle(),
                booking.getEvent().getStartsAt(), booking.getEvent().getEndsAt(),
                booking.getCurrency(), booking.getTotalAmount(), booking.getExpiresAt(), booking.getCreatedAt());
    }
}