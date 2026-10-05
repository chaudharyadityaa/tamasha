package com.eventhub.booking;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BookingSeatRepository extends JpaRepository<BookingSeat, Long> {

    List<BookingSeat> findByBookingId(Long bookingId);

    /** Seats currently claimed (not released) for the event. */
    long countByEventIdAndReleasedAtIsNull(Long eventId);
}