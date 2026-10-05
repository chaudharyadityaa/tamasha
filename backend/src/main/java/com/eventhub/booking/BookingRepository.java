package com.eventhub.booking;

import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface BookingRepository extends JpaRepository<Booking, Long> {

    Optional<Booking> findByReference(String reference);

    boolean existsByReference(String reference);

    Optional<Booking> findByUserIdAndIdempotencyKey(Long userId, String idempotencyKey);

    /**
     * Unpaid bookings whose hold has run out and that still claim one of these seats.
     * Locked (FOR UPDATE) and ordered by id, so concurrent cleanups take turns in the same order.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select b from Booking b
            where b.event.id = :eventId
              and b.status = com.eventhub.booking.BookingStatus.PENDING_PAYMENT
              and b.expiresAt <= :now
              and b.id in (select bs.booking.id from BookingSeat bs
                           where bs.event.id = :eventId and bs.seat.id in :seatIds and bs.releasedAt is null)
            order by b.id
            """)
    List<Booking> findExpiredHoldsOnSeats(@Param("eventId") Long eventId,
                                          @Param("seatIds") Collection<Long> seatIds,
                                          @Param("now") Instant now);
}