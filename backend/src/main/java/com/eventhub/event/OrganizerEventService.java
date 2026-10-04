package com.eventhub.event;

import com.eventhub.common.BadRequestException;
import com.eventhub.common.ConflictException;
import com.eventhub.common.NotFoundException;
import com.eventhub.common.PageResponse;
import com.eventhub.common.Text;
import com.eventhub.security.ActorVerifier;
import com.eventhub.user.Role;
import com.eventhub.user.User;
import com.eventhub.venue.SeatRepository;
import com.eventhub.venue.Venue;
import com.eventhub.venue.VenueRepository;
import java.time.Instant;
import java.util.Currency;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OrganizerEventService {

    private static final int MAX_PAGE_SIZE = 100;
    private static final String DEFAULT_CURRENCY = "INR";

    private final EventRepository events;
    private final VenueRepository venues;
    private final TicketTypeRepository ticketTypes;
    private final SeatRepository seats;
    private final ActorVerifier actors;

    public OrganizerEventService(EventRepository events, VenueRepository venues,
                                 TicketTypeRepository ticketTypes, SeatRepository seats,
                                 ActorVerifier actors) {
        this.events = events;
        this.venues = venues;
        this.ticketTypes = ticketTypes;
        this.seats = seats;
        this.actors = actors;
    }

    @Transactional
    public EventResponse create(long organizerId, CreateEventRequest request) {
        User organizer = actors.requireRole(organizerId, Role.ORGANIZER);
        // Only venues owned by this organizer are visible; anything else looks like "not found".
        Venue venue = venues.findByIdAndOwnerId(request.venueId(), organizerId)
                .orElseThrow(() -> new NotFoundException("Venue not found"));
        requireInTheFuture(request.startsAt());
        String currency = request.currency() == null ? DEFAULT_CURRENCY : request.currency();
        requireRealCurrency(currency);

        Event event;
        try {
            event = new Event(organizer, venue, request.title().trim(),
                    Text.blankToNull(request.description()), request.category().trim(),
                    Text.blankToNull(request.imageUrl()), request.startsAt(), request.endsAt(),
                    request.seatingMode(), currency);
            if (request.cancellationCutoffHours() != null) {
                event.setCancellationCutoffHours(request.cancellationCutoffHours());
            }
        } catch (IllegalArgumentException e) {
            throw new BadRequestException(e.getMessage());
        }
        return EventResponse.from(events.save(event));
    }

    @Transactional
    public EventResponse update(long organizerId, long eventId, UpdateEventRequest request) {
        actors.requireRole(organizerId, Role.ORGANIZER);
        Event event = ownEvent(organizerId, eventId);
        if (event.getStatus() != EventStatus.DRAFT) {
            throw new ConflictException("Only draft events can be edited. Unpublish the event first.");
        }
        requireInTheFuture(request.startsAt());
        try {
            event.updateDetails(request.title().trim(), Text.blankToNull(request.description()),
                    request.category().trim(), Text.blankToNull(request.imageUrl()),
                    request.startsAt(), request.endsAt());
            if (request.cancellationCutoffHours() != null) {
                event.setCancellationCutoffHours(request.cancellationCutoffHours());
            }
        } catch (IllegalArgumentException e) {
            throw new BadRequestException(e.getMessage());
        }
        return EventResponse.from(event);
    }

    @Transactional
    public EventResponse publish(long organizerId, long eventId) {
        actors.requireRole(organizerId, Role.ORGANIZER);
        // Locked, so ticket types cannot change while we check them.
        Event event = events.findByIdAndOrganizerIdForUpdate(eventId, organizerId)
                .orElseThrow(() -> new NotFoundException("Event not found"));
        if (event.getStatus() == EventStatus.DRAFT) {
            if (!event.getStartsAt().isAfter(Instant.now())) {
                throw new ConflictException("An event that has already started cannot be published");
            }
            requireSellable(event);
        }
        transition(event::publish);
        return EventResponse.from(event);
    }

    @Transactional
    public EventResponse unpublish(long organizerId, long eventId) {
        actors.requireRole(organizerId, Role.ORGANIZER);
        Event event = ownEvent(organizerId, eventId);
        transition(event::unpublish);
        return EventResponse.from(event);
    }

    @Transactional
    public EventResponse cancel(long organizerId, long eventId) {
        actors.requireRole(organizerId, Role.ORGANIZER);
        Event event = ownEvent(organizerId, eventId);
        transition(event::cancel); // later: also cancels the event's bookings and releases seats
        return EventResponse.from(event);
    }

    @Transactional(readOnly = true)
    public EventResponse getMine(long organizerId, long eventId) {
        actors.requireRole(organizerId, Role.ORGANIZER);
        return EventResponse.from(ownEvent(organizerId, eventId));
    }

    @Transactional(readOnly = true)
    public PageResponse<EventResponse> listMine(long organizerId, EventStatus status, int page, int size) {
        actors.requireRole(organizerId, Role.ORGANIZER);
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), MAX_PAGE_SIZE),
                Sort.by(Sort.Direction.DESC, "createdAt").and(Sort.by(Sort.Direction.DESC, "id")));
        Page<Event> result = (status == null)
                ? events.findByOrganizerId(organizerId, pageable)
                : events.findByOrganizerIdAndStatus(organizerId, status, pageable);
        return PageResponse.from(result.map(EventResponse::from));
    }

    private Event ownEvent(long organizerId, long eventId) {
        return events.findByIdAndOrganizerId(eventId, organizerId)
                .orElseThrow(() -> new NotFoundException("Event not found"));
    }

    /** An event may only go on sale if customers could actually buy something. */
    private void requireSellable(Event event) {
        List<TicketType> types = ticketTypes.findByEventIdOrderByIdAsc(event.getId());
        if (types.isEmpty()) {
            throw new ConflictException("Add at least one ticket type before publishing");
        }
        if (event.getSeatingMode() == SeatingMode.RESERVED_SEATING) {
            Long venueId = event.getVenue().getId();
            for (TicketType type : types) {
                if (!seats.existsByVenueIdAndSection(venueId, type.getSeatSection())) {
                    throw new ConflictException(
                            "The venue has no seats in section '" + type.getSeatSection() + "'");
                }
            }
        }
    }

    private static void requireInTheFuture(Instant startsAt) {
        if (!startsAt.isAfter(Instant.now())) {
            throw new BadRequestException("The event must start in the future");
        }
    }

    private static void requireRealCurrency(String code) {
        try {
            Currency.getInstance(code);
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Unknown currency code");
        }
    }

    /** Converts "this status change is not allowed" into a 409 for just this one call. */
    private static void transition(Runnable change) {
        try {
            change.run();
        } catch (IllegalStateException e) {
            throw new ConflictException(e.getMessage());
        }
    }
}