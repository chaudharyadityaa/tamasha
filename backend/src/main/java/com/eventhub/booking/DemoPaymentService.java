package com.eventhub.booking;

import com.eventhub.common.ConflictException;
import com.eventhub.common.NotFoundException;
import com.eventhub.security.ActorVerifier;
import java.time.Instant;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * DEMO payments only: records a simulated successful payment and confirms the booking.
 * This bean does not exist unless app.payments.demo-enabled=true. No money moves.
 */
@Service
@ConditionalOnProperty(name = "app.payments.demo-enabled", havingValue = "true")
public class DemoPaymentService {

    private final BookingRepository bookings;
    private final PaymentRepository payments;
    private final ActorVerifier actors;

    public DemoPaymentService(BookingRepository bookings, PaymentRepository payments, ActorVerifier actors) {
        this.bookings = bookings;
        this.payments = payments;
        this.actors = actors;
    }

    @Transactional
    public BookingResponse pay(long userId, long bookingId) {
        actors.requireActive(userId);
        Booking booking = bookings.findByIdAndUserIdForUpdate(bookingId, userId) // locked: no double payments
                .orElseThrow(() -> new NotFoundException("Booking not found"));

        if (booking.getStatus() == BookingStatus.CONFIRMED) {
            // Already paid (for example a double click): return it again, never charge twice.
            return BookingResponse.from(booking,
                    payments.findFirstByBookingIdOrderByIdDesc(bookingId).orElse(null));
        }
        if (booking.getStatus() != BookingStatus.PENDING_PAYMENT) {
            throw new ConflictException("A " + booking.getStatus() + " booking cannot be paid");
        }
        Instant now = Instant.now();
        if (!now.isBefore(booking.getExpiresAt())) {
            throw new ConflictException("The hold on this booking has expired. Please book again.");
        }

        Payment payment = payments.save(Payment.demoSuccess(booking));
        booking.confirm(now);
        return BookingResponse.from(booking, payment);
    }
}