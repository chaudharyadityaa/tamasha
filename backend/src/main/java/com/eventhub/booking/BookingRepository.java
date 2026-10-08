package com.eventhub.booking;

import jakarta.persistence.LockModeType;
import jakarta.persistence.QueryHint;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.QueryHints;
import org.springframework.data.repository.query.Param;

public interface BookingRepository extends JpaRepository<Booking, Long> {

    Optional<Booking> findByReference(String reference);

    boolean existsByReference(String reference);

    Optional<Booking> findByUserIdAndIdempotencyKey(Long userId, String idempotencyKey);

    /** Only returns the booking if it belongs to this user. */
    @EntityGraph(attributePaths = "event")
    Optional<Booking> findByIdAndUserId(Long id, Long userId);

    /** Same lookup, but locks the row so paying, cancelling and sweeping the booking take turns. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select b from Booking b where b.id = :id and b.user.id = :userId")
    Optional<Booking> findByIdAndUserIdForUpdate(@Param("id") Long id, @Param("userId") Long userId);

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

    /**
     * For the sweeper: overdue unpaid holds. SKIP LOCKED (lock timeout -2) means bookings that are
     * being paid or cancelled right now are simply left for the next run instead of blocking us.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @QueryHints(@QueryHint(name = "jakarta.persistence.lock.timeout", value = "-2"))
    @Query("""
            select b from Booking b
            where b.status = com.eventhub.booking.BookingStatus.PENDING_PAYMENT and b.expiresAt <= :now
            order by b.id
            """)
    List<Booking> findOverdueHolds(@Param("now") Instant now, Pageable pageable);

    // ---- "My bookings" views ----

    @EntityGraph(attributePaths = "event")
    Page<Booking> findByUserId(Long userId, Pageable pageable);

    /** Paid, or unpaid with time left, for an event that has not ended. */
    @EntityGraph(attributePaths = "event")
    @Query("""
            select b from Booking b
            where b.user.id = :userId and b.event.endsAt > :now
              and (b.status = com.eventhub.booking.BookingStatus.CONFIRMED
                   or (b.status = com.eventhub.booking.BookingStatus.PENDING_PAYMENT and b.expiresAt > :now))
            """)
    Page<Booking> findUpcoming(@Param("userId") Long userId, @Param("now") Instant now, Pageable pageable);

    @EntityGraph(attributePaths = "event")
    @Query("""
            select b from Booking b
            where b.user.id = :userId and b.event.endsAt <= :now
              and b.status = com.eventhub.booking.BookingStatus.CONFIRMED
            """)
    Page<Booking> findPast(@Param("userId") Long userId, @Param("now") Instant now, Pageable pageable);

    /** Cancelled, expired, or unpaid holds that ran out (even if the sweeper has not marked them yet). */
    @EntityGraph(attributePaths = "event")
    @Query("""
            select b from Booking b
            where b.user.id = :userId
              and (b.status = com.eventhub.booking.BookingStatus.CANCELLED
                   or b.status = com.eventhub.booking.BookingStatus.EXPIRED
                   or (b.status = com.eventhub.booking.BookingStatus.PENDING_PAYMENT and b.expiresAt <= :now))
            """)
    Page<Booking> findCancelledOrExpired(@Param("userId") Long userId, @Param("now") Instant now, Pageable pageable);

    // ---- Organizer guards, cancel-all and statistics ----

    /** Confirmed bookings, or unpaid ones whose hold has not run out. */
    @Query("""
            select count(b) from Booking b
            where b.event.id = :eventId
              and (b.status = com.eventhub.booking.BookingStatus.CONFIRMED
                   or (b.status = com.eventhub.booking.BookingStatus.PENDING_PAYMENT and b.expiresAt > :now))
            """)
    long countActiveForEvent(@Param("eventId") Long eventId, @Param("now") Instant now);

    /** Every unpaid or confirmed booking of the event, locked so they cannot change underneath us. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select b from Booking b
            where b.event.id = :eventId
              and b.status in (com.eventhub.booking.BookingStatus.PENDING_PAYMENT,
                               com.eventhub.booking.BookingStatus.CONFIRMED)
            order by b.id
            """)
    List<Booking> findOpenForEventForUpdate(@Param("eventId") Long eventId);

    /** All bookings of an event, with the customer loaded (for the organizer's list). */
    @EntityGraph(attributePaths = "user")
    Page<Booking> findByEventId(Long eventId, Pageable pageable);

    @Query("select b.status, count(b) from Booking b where b.event.id = :eventId group by b.status")
    List<Object[]> countByStatusForEvent(@Param("eventId") Long eventId);

    /** Null when there are no confirmed bookings. */
    @Query("select sum(b.totalAmount) from Booking b where b.event.id = :eventId "
            + "and b.status = com.eventhub.booking.BookingStatus.CONFIRMED")
    BigDecimal sumConfirmedRevenue(@Param("eventId") Long eventId);

    /** Rows of [ticketTypeId, status, total quantity] for confirmed and still-held general-admission lines. */
    @Query("""
            select i.ticketType.id, b.status, sum(i.quantity)
            from BookingItem i join i.booking b
            where b.event.id = :eventId
              and (b.status = com.eventhub.booking.BookingStatus.CONFIRMED
                   or (b.status = com.eventhub.booking.BookingStatus.PENDING_PAYMENT and b.expiresAt > :now))
            group by i.ticketType.id, b.status
            """)
    List<Object[]> sumItemQuantities(@Param("eventId") Long eventId, @Param("now") Instant now);

    /** Rows of [ticketTypeId, status, seat count] for confirmed and still-held reserved seats. */
    @Query("""
            select s.ticketType.id, b.status, count(s)
            from BookingSeat s join s.booking b
            where s.event.id = :eventId and s.releasedAt is null
              and (b.status = com.eventhub.booking.BookingStatus.CONFIRMED
                   or (b.status = com.eventhub.booking.BookingStatus.PENDING_PAYMENT and b.expiresAt > :now))
            group by s.ticketType.id, b.status
            """)
    List<Object[]> countSeatClaims(@Param("eventId") Long eventId, @Param("now") Instant now);
}