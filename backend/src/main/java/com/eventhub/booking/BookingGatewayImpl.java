package com.eventhub.booking;

import com.eventhub.event.BookingGateway;
import java.time.Instant;
import java.util.List;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/** The booking module's answers to the event module's questions (see BookingGateway). */
@Component
public class BookingGatewayImpl implements BookingGateway {

    private final BookingRepository bookings;
    private final BookingItemRepository items;
    private final BookingSeatRepository seats;
    private final PaymentRepository payments;
    private final BookingInventory inventory;

    public BookingGatewayImpl(BookingRepository bookings, BookingItemRepository items,
                              BookingSeatRepository seats, PaymentRepository payments,
                              BookingInventory inventory) {
        this.bookings = bookings;
        this.items = items;
        this.seats = seats;
        this.payments = payments;
        this.inventory = inventory;
    }

    @Override
    @Transactional(readOnly = true)
    public boolean hasActiveBookings(long eventId) {
        return bookings.countActiveForEvent(eventId, Instant.now()) > 0;
    }

    @Override
    @Transactional(readOnly = true)
    public boolean isTicketTypeUsed(long ticketTypeId) {
        return items.existsByTicketTypeId(ticketTypeId) || seats.existsByTicketTypeId(ticketTypeId);
    }

    /** MANDATORY: the caller (the event cancellation) must already be inside a transaction. */
    @Override
    @Transactional(propagation = Propagation.MANDATORY)
    public int cancelAllBookings(long eventId) {
        Instant now = Instant.now();
        List<Booking> open = bookings.findOpenForEventForUpdate(eventId);
        for (Booking booking : open) {
            boolean wasPaid = booking.getStatus() == BookingStatus.CONFIRMED;
            booking.cancel(now);                       // also releases the reserved seats
            inventory.releaseItems(booking);           // returns general-admission tickets
            if (wasPaid) {
                payments.findFirstByBookingIdAndStatus(booking.getId(), PaymentStatus.SUCCEEDED)
                        .ifPresent(Payment::markRefunded); // a DEMO refund: no money actually moves
            }
        }
        return open.size();
    }
}