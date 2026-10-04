package com.eventhub.venue;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SeatRepository extends JpaRepository<Seat, Long> {

    List<Seat> findByVenueId(Long venueId);

    long countByVenueId(Long venueId);

    boolean existsByVenueIdAndSection(Long venueId, String section);
}