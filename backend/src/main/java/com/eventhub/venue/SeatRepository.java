package com.eventhub.venue;

import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SeatRepository extends JpaRepository<Seat, Long> {

    /** One row of the per-section summary. */
    interface SectionSummary {
        String getSection();

        long getSeatCount();

        long getRowCount();
    }

    List<Seat> findByVenueId(Long venueId);

    long countByVenueId(Long venueId);

    boolean existsByVenueIdAndSection(Long venueId, String section);

    List<Seat> findByVenueIdAndSectionIn(Long venueId, Collection<String> sections);

    @Query("""
            select s.section as section, count(s) as seatCount, count(distinct s.rowLabel) as rowCount
            from Seat s
            where s.venue.id = :venueId
            group by s.section
            order by s.section
            """)
    List<SectionSummary> summarizeSections(@Param("venueId") Long venueId);

    /** Which of these rows already have seats in the section? */
    @Query("""
            select distinct s.rowLabel from Seat s
            where s.venue.id = :venueId and s.section = :section and s.rowLabel in :rows
            """)
    List<String> findExistingRowLabels(@Param("venueId") Long venueId,
                                       @Param("section") String section,
                                       @Param("rows") Collection<String> rows);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("delete from Seat s where s.venue.id = :venueId and s.section = :section")
    int deleteBySection(@Param("venueId") Long venueId, @Param("section") String section);
}