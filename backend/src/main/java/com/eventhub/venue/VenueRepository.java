package com.eventhub.venue;

import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VenueRepository extends JpaRepository<Venue, Long> {

    List<Venue> findByOwnerId(Long ownerId);

    Page<Venue> findByOwnerId(Long ownerId, Pageable pageable);

    /** Only returns the venue if it belongs to this owner. */
    Optional<Venue> findByIdAndOwnerId(Long id, Long ownerId);
}