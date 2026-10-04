package com.eventhub.event;

import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface EventRepository extends JpaRepository<Event, Long> {

    Page<Event> findByStatus(EventStatus status, Pageable pageable);

    // @EntityGraph loads the venue in the same query instead of one extra query per event.
    @EntityGraph(attributePaths = "venue")
    Page<Event> findByOrganizerId(Long organizerId, Pageable pageable);

    @EntityGraph(attributePaths = "venue")
    Page<Event> findByOrganizerIdAndStatus(Long organizerId, EventStatus status, Pageable pageable);

    /** Only returns the event if it belongs to this organizer. */
    @EntityGraph(attributePaths = "venue")
    Optional<Event> findByIdAndOrganizerId(Long id, Long organizerId);

    /**
     * Same lookup, but locks the row (SELECT ... FOR UPDATE) until the transaction ends.
     * Other transactions that try to lock this event wait their turn.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select e from Event e where e.id = :id and e.organizer.id = :organizerId")
    Optional<Event> findByIdAndOrganizerIdForUpdate(@Param("id") Long id,
                                                    @Param("organizerId") Long organizerId);
}