package com.eventhub.booking;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TicketRepository extends JpaRepository<Ticket, Long> {

    boolean existsByBookingId(Long bookingId);

    List<Ticket> findByBookingId(Long bookingId);

    @EntityGraph(attributePaths = {"booking", "event", "event.venue", "ticketType",
            "bookingSeat", "bookingSeat.seat"})
    List<Ticket> findByBookingIdOrderByIdAsc(Long bookingId);

    /** Only returns the ticket if its booking belongs to this user. */
    @EntityGraph(attributePaths = {"booking", "event", "event.venue", "ticketType",
            "bookingSeat", "bookingSeat.seat"})
    Optional<Ticket> findByIdAndBookingUserId(Long id, Long userId);

    /** Only returns the ticket if it belongs to this event. */
    @EntityGraph(attributePaths = {"booking", "booking.user", "ticketType", "bookingSeat", "bookingSeat.seat"})
    Optional<Ticket> findByCodeAndEventId(String code, Long eventId);

    /**
     * The check-in itself: ONE atomic statement. It only succeeds (returns 1) if the ticket is still
     * VALID, so two scanners racing for the same ticket can never both get in.
     */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("""
            update Ticket t
            set t.status = com.eventhub.booking.TicketStatus.CHECKED_IN,
                t.checkedInAt = :now, t.checkedInBy = :scannedBy, t.updatedAt = :now
            where t.code = :code and t.event.id = :eventId
              and t.status = com.eventhub.booking.TicketStatus.VALID
            """)
    int checkIn(@Param("code") String code, @Param("eventId") Long eventId,
                @Param("scannedBy") Long scannedBy, @Param("now") Instant now);

    @Query("select t.status, count(t) from Ticket t where t.event.id = :eventId group by t.status")
    List<Object[]> countByStatusForEvent(@Param("eventId") Long eventId);
}