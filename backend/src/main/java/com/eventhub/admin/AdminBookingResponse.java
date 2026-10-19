package com.eventhub.admin;

import com.eventhub.booking.Booking;
import com.eventhub.booking.BookingStatus;
import java.math.BigDecimal;
import java.time.Instant;

/** One row of the admin booking list. Admins see the customer's email (they manage accounts). */
public record AdminBookingResponse(Long id, String reference, BookingStatus status, String customerName,
                                   String customerEmail, Long eventId, String eventTitle, String currency,
                                   BigDecimal totalAmount, Instant createdAt, Instant expiresAt) {

    public static AdminBookingResponse from(Booking booking, Instant now) {
        // An unpaid hold that ran out shows as EXPIRED even if the sweeper has not marked it yet.
        BookingStatus shown = booking.getStatus() == BookingStatus.PENDING_PAYMENT
                && !now.isBefore(booking.getExpiresAt())
                ? BookingStatus.EXPIRED
                : booking.getStatus();
        return new AdminBookingResponse(booking.getId(), booking.getReference(), shown,
                booking.getUser().getFullName(), booking.getUser().getEmail(),
                booking.getEvent().getId(), booking.getEvent().getTitle(), booking.getCurrency(),
                booking.getTotalAmount(), booking.getCreatedAt(), booking.getExpiresAt());
    }
}