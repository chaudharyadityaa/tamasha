package com.eventhub.venue;

import com.eventhub.common.BadRequestException;
import com.eventhub.common.NotFoundException;
import com.eventhub.common.PageResponse;
import com.eventhub.common.Text;
import com.eventhub.security.ActorVerifier;
import com.eventhub.user.Role;
import com.eventhub.user.User;
import java.time.ZoneId;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class VenueService {

    private static final int MAX_PAGE_SIZE = 100;

    private final VenueRepository venues;
    private final ActorVerifier actors;

    public VenueService(VenueRepository venues, ActorVerifier actors) {
        this.venues = venues;
        this.actors = actors;
    }

    @Transactional
    public VenueResponse create(long organizerId, CreateVenueRequest request) {
        User organizer = actors.requireRole(organizerId, Role.ORGANIZER);
        String timeZone = request.timeZone().trim();
        if (!ZoneId.getAvailableZoneIds().contains(timeZone)) {
            throw new BadRequestException("Unknown time zone. Use an IANA name such as Asia/Kolkata");
        }
        Venue venue = venues.save(new Venue(organizer, request.name().trim(),
                request.addressLine().trim(), request.city().trim(),
                Text.blankToNull(request.region()), request.country().trim(),
                timeZone, request.capacity()));
        return VenueResponse.from(venue);
    }

    @Transactional(readOnly = true)
    public PageResponse<VenueResponse> listMine(long organizerId, int page, int size) {
        actors.requireRole(organizerId, Role.ORGANIZER);
        PageRequest pageable = PageRequest.of(Math.max(page, 0),
                Math.min(Math.max(size, 1), MAX_PAGE_SIZE), Sort.by("name").and(Sort.by("id")));
        return PageResponse.from(venues.findByOwnerId(organizerId, pageable).map(VenueResponse::from));
    }

    @Transactional(readOnly = true)
    public VenueResponse getMine(long organizerId, long venueId) {
        actors.requireRole(organizerId, Role.ORGANIZER);
        return venues.findByIdAndOwnerId(venueId, organizerId)
                .map(VenueResponse::from)
                .orElseThrow(() -> new NotFoundException("Venue not found"));
    }
}