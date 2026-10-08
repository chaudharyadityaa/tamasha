package com.eventhub.booking;

import java.math.BigDecimal;
import java.time.Instant;

/** One row of an organizer's guest list. Shows the customer's name only, never their email. */
public record OrganizerBookingResponse(Long id, String reference, BookingStatus status,
                                       String customerName, String currency, BigDecimal totalAmount,
                                       Instant createdAt, Instant expiresAt) {

    public static OrganizerBookingResponse from(Booking booking, Instant now) {
        // An unpaid hold that ran out shows as EXPIRED even if the sweeper has not marked it yet.
        BookingStatus shown = booking.getStatus() == BookingStatus.PENDING_PAYMENT
                && !now.isBefore(booking.getExpiresAt())
                ? BookingStatus.EXPIRED
                : booking.getStatus();
        return new OrganizerBookingResponse(booking.getId(), booking.getReference(), shown,
                booking.getUser().getFullName(), booking.getCurrency(), booking.getTotalAmount(),
                booking.getCreatedAt(), booking.getExpiresAt());
    }
}