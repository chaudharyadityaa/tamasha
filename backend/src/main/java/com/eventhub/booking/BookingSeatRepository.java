package com.eventhub.booking;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface BookingSeatRepository extends JpaRepository<BookingSeat, Long> {

    List<BookingSeat> findByBookingId(Long bookingId);

    boolean existsByTicketTypeId(Long ticketTypeId);

    /** Seats currently claimed (not released) for the event. */
    long countByEventIdAndReleasedAtIsNull(Long eventId);

    /** Of these seats, which are still claimed by some booking? */
    @Query("select bs.seat.id from BookingSeat bs "
            + "where bs.event.id = :eventId and bs.seat.id in :seatIds and bs.releasedAt is null")
    List<Long> findActiveSeatIds(@Param("eventId") Long eventId, @Param("seatIds") Collection<Long> seatIds);

    @Query("select bs.seat.id from BookingSeat bs where bs.event.id = :eventId and bs.releasedAt is null "
            + "and bs.booking.status = com.eventhub.booking.BookingStatus.CONFIRMED")
    List<Long> findConfirmedSeatIds(@Param("eventId") Long eventId);

    @Query("select bs.seat.id from BookingSeat bs where bs.event.id = :eventId and bs.releasedAt is null "
            + "and bs.booking.status = com.eventhub.booking.BookingStatus.PENDING_PAYMENT "
            + "and bs.booking.expiresAt > :now")
    List<Long> findHeldSeatIds(@Param("eventId") Long eventId, @Param("now") Instant now);
}