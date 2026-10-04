package com.eventhub.venue;

import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface VenueRepository extends JpaRepository<Venue, Long> {

    List<Venue> findByOwnerId(Long ownerId);

    Page<Venue> findByOwnerId(Long ownerId, Pageable pageable);

    /** Only returns the venue if it belongs to this owner. */
    Optional<Venue> findByIdAndOwnerId(Long id, Long ownerId);

    /** Same lookup, but locks the row until the transaction ends so concurrent seat changes take turns. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select v from Venue v where v.id = :id and v.owner.id = :ownerId")
    Optional<Venue> findByIdAndOwnerIdForUpdate(@Param("id") Long id, @Param("ownerId") Long ownerId);
}