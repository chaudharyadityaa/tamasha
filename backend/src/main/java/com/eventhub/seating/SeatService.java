package com.eventhub.seating;

import com.eventhub.common.BadRequestException;
import com.eventhub.common.ConflictException;
import com.eventhub.common.NotFoundException;
import com.eventhub.event.TicketTypeRepository;
import com.eventhub.security.ActorVerifier;
import com.eventhub.user.Role;
import com.eventhub.venue.Seat;
import com.eventhub.venue.SeatRepository;
import com.eventhub.venue.Venue;
import com.eventhub.venue.VenueRepository;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SeatService {

    private static final int MAX_SEATS_PER_REQUEST = 2000;

    private final VenueRepository venues;
    private final SeatRepository seats;
    private final TicketTypeRepository ticketTypes;
    private final ActorVerifier actors;

    public SeatService(VenueRepository venues, SeatRepository seats,
                       TicketTypeRepository ticketTypes, ActorVerifier actors) {
        this.venues = venues;
        this.seats = seats;
        this.ticketTypes = ticketTypes;
        this.actors = actors;
    }

    @Transactional
    public SeatBlockResponse createBlock(long organizerId, long venueId, CreateSeatBlockRequest request) {
        actors.requireRole(organizerId, Role.ORGANIZER);
        // Row lock: concurrent seat changes for this venue wait here, so the checks below stay true.
        Venue venue = lockedVenue(organizerId, venueId);

        String section = request.section().trim();
        if (section.isEmpty()) {
            throw new BadRequestException("Section name cannot be blank");
        }
        List<String> rows = request.rows().stream()
                .map(row -> row.trim().toUpperCase(Locale.ROOT))
                .toList();
        if (new HashSet<>(rows).size() != rows.size()) {
            throw new BadRequestException("Row labels must be unique (labels are not case-sensitive)");
        }

        int seatsToCreate = rows.size() * request.seatsPerRow();
        if (seatsToCreate > MAX_SEATS_PER_REQUEST) {
            throw new BadRequestException("A single request can create at most " + MAX_SEATS_PER_REQUEST + " seats");
        }
        long existing = seats.countByVenueId(venueId);
        if (existing + seatsToCreate > venue.getCapacity()) {
            throw new BadRequestException("These seats would exceed the venue capacity of " + venue.getCapacity()
                    + " (the venue already has " + existing + " seats)");
        }
        List<String> clashing = seats.findExistingRowLabels(venueId, section, rows);
        if (!clashing.isEmpty()) {
            throw new ConflictException("Section '" + section + "' already has seats in row(s): "
                    + String.join(", ", clashing) + ". Delete the section to regenerate it.");
        }

        List<Seat> block = new ArrayList<>(seatsToCreate);
        for (String row : rows) {
            for (int number = 1; number <= request.seatsPerRow(); number++) {
                block.add(new Seat(venue, section, row, String.valueOf(number)));
            }
        }
        seats.saveAll(block);
        return new SeatBlockResponse(section, rows, request.seatsPerRow(), seatsToCreate);
    }

    @Transactional(readOnly = true)
    public List<SeatSectionResponse> listSections(long organizerId, long venueId) {
        actors.requireRole(organizerId, Role.ORGANIZER);
        venues.findByIdAndOwnerId(venueId, organizerId)
                .orElseThrow(() -> new NotFoundException("Venue not found"));
        return seats.summarizeSections(venueId).stream().map(SeatSectionResponse::from).toList();
    }

    @Transactional
    public void deleteSection(long organizerId, long venueId, String section) {
        actors.requireRole(organizerId, Role.ORGANIZER);
        lockedVenue(organizerId, venueId);
        if (ticketTypes.countUsingSection(venueId, section) > 0) {
            throw new ConflictException(
                    "This section is used by a ticket type of one of your events. Remove that ticket type first.");
        }
        if (seats.deleteBySection(venueId, section) == 0) {
            throw new NotFoundException("Section not found");
        }
    }

    private Venue lockedVenue(long organizerId, long venueId) {
        return venues.findByIdAndOwnerIdForUpdate(venueId, organizerId)
                .orElseThrow(() -> new NotFoundException("Venue not found"));
    }
}