package com.eventhub.event;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TicketTypeRepository extends JpaRepository<TicketType, Long> {

    List<TicketType> findByEventId(Long eventId);

    List<TicketType> findByEventIdOrderByIdAsc(Long eventId);

    /** Only returns the ticket type if it belongs to this event. */
    Optional<TicketType> findByIdAndEventId(Long id, Long eventId);

    boolean existsByEventIdAndNameIgnoreCase(Long eventId, String name);

    boolean existsByEventIdAndSeatSection(Long eventId, String seatSection);

    long countByEventId(Long eventId);

    /** Total general-admission tickets already defined for the event (0 if none). */
    @Query("select coalesce(sum(t.quantityTotal), 0L) from TicketType t where t.event.id = :eventId")
    long sumQuantityTotalByEventId(@Param("eventId") Long eventId);

    /** How many ticket types, across all events at this venue, sell this seat section? */
    @Query("select count(t) from TicketType t where t.event.venue.id = :venueId and t.seatSection = :section")
    long countUsingSection(@Param("venueId") Long venueId, @Param("section") String section);
}