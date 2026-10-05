package com.eventhub.booking;

import java.time.Instant;
import java.util.List;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class BookingExpiryService {

    private final BookingRepository bookings;
    private final BookingInventory inventory;

    public BookingExpiryService(BookingRepository bookings, BookingInventory inventory) {
        this.bookings = bookings;
        this.inventory = inventory;
    }

    /**
     * Expires up to batchSize unpaid bookings whose hold has run out: marks them EXPIRED, frees their
     * seats and returns their general-admission tickets. Bookings locked by someone else are skipped.
     *
     * @return how many bookings were expired
     */
    @Transactional
    public int expireBatch(Instant now, int batchSize) {
        List<Booking> overdue = bookings.findOverdueHolds(now, PageRequest.of(0, batchSize));
        for (Booking booking : overdue) {
            booking.expire(now);
            inventory.releaseItems(booking);
        }
        return overdue.size();
    }
}