package com.eventhub.event;

import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

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
}