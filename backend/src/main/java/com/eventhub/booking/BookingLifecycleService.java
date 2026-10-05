package com.eventhub.booking;

import com.eventhub.common.ConflictException;
import com.eventhub.common.NotFoundException;
import com.eventhub.event.Event;
import com.eventhub.security.ActorVerifier;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class BookingLifecycleService {

    private final BookingRepository bookings;
    private final PaymentRepository payments;
    private final BookingInventory inventory;
    private final ActorVerifier actors;

    public BookingLifecycleService(BookingRepository bookings, PaymentRepository payments,
                                   BookingInventory inventory, ActorVerifier actors) {
        this.bookings = bookings;
        this.payments = payments;
        this.inventory = inventory;
        this.actors = actors;
    }

    /**
     * Cancels the customer's own booking. Unpaid bookings can always be cancelled; paid ones only
     * until the event's cancellation cutoff. Seats and general-admission tickets are released.
     */
    @Transactional
    public BookingResponse cancel(long userId, long bookingId) {
        actors.requireActive(userId);
        // Locked: a payment, another cancel or the sweeper cannot change this booking at the same time.
        Booking booking = bookings.findByIdAndUserIdForUpdate(bookingId, userId)
                .orElseThrow(() -> new NotFoundException("Booking not found"));
        Instant now = Instant.now();

        if (booking.getStatus() == BookingStatus.CANCELLED) {
            return respond(booking); // already cancelled: repeating the request is harmless
        }
        if (booking.getStatus() == BookingStatus.EXPIRED) {
            throw new ConflictException("This booking has expired, so there is nothing to cancel");
        }
        boolean wasPaid = booking.getStatus() == BookingStatus.CONFIRMED;
        if (wasPaid) {
            requireWithinCancellationWindow(booking.getEvent(), now);
        }

        booking.cancel(now); // also releases the reserved seats
        inventory.releaseItems(booking);
        if (wasPaid) {
            payments.findFirstByBookingIdAndStatus(bookingId, PaymentStatus.SUCCEEDED)
                    .ifPresent(Payment::markRefunded); // a DEMO refund: no money actually moves
        }
        return respond(booking);
    }

    private void requireWithinCancellationWindow(Event event, Instant now) {
        Instant lastMoment = event.getStartsAt().minus(event.getCancellationCutoffHours(), ChronoUnit.HOURS);
        if (now.isAfter(lastMoment)) {
            throw new ConflictException("Paid bookings can only be cancelled up to "
                    + event.getCancellationCutoffHours() + " hours before the event starts");
        }
    }

    private BookingResponse respond(Booking booking) {
        return BookingResponse.from(booking,
                payments.findFirstByBookingIdOrderByIdDesc(booking.getId()).orElse(null));
    }
}