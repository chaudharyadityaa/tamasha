package com.eventhub.admin;

import com.eventhub.event.Event;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AdminEventRepository extends JpaRepository<Event, Long>, JpaSpecificationExecutor<Event> {

    @Override
    @EntityGraph(attributePaths = {"organizer", "venue"})
    Page<Event> findAll(Specification<Event> spec, Pageable pageable);

    /** Locks the event exclusively so bookings being created finish first and new ones wait. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select e from Event e where e.id = :id")
    Optional<Event> findByIdForUpdate(@Param("id") Long id);
}