package com.eventhub.admin;

import com.eventhub.booking.Booking;
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

public interface AdminBookingRepository extends JpaRepository<Booking, Long>, JpaSpecificationExecutor<Booking> {

    @Override
    @EntityGraph(attributePaths = {"user", "event"})
    Page<Booking> findAll(Specification<Booking> spec, Pageable pageable);

    /** Locks the booking so paying, cancelling and sweeping it take turns. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select b from Booking b where b.id = :id")
    Optional<Booking> findByIdForUpdate(@Param("id") Long id);
}