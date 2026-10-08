package com.eventhub.booking;

import com.eventhub.common.ConflictException;
import com.eventhub.common.NotFoundException;
import com.eventhub.event.Event;
import com.eventhub.event.EventRepository;
import com.eventhub.event.EventStatus;
import com.eventhub.security.ActorVerifier;
import com.eventhub.user.Role;
import java.time.Instant;
import java.util.EnumMap;
import java.util.Locale;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CheckInService {

    private final ActorVerifier actors;
    private final EventRepository events;
    private final TicketRepository tickets;
    private final CheckInProperties properties;

    public CheckInService(ActorVerifier actors, EventRepository events, TicketRepository tickets,
                          CheckInProperties properties) {
        this.actors = actors;
        this.events = events;
        this.tickets = tickets;
        this.properties = properties;
    }

    /** Admits the holder of the ticket with this code, exactly once. */
    @Transactional
    public CheckInResponse checkIn(long organizerId, long eventId, String rawCode) {
        actors.requireRole(organizerId, Role.ORGANIZER);
        Event event = ownEvent(organizerId, eventId);
        Instant now = Instant.now();

        if (event.getStatus() != EventStatus.PUBLISHED) {
            throw new ConflictException("Check-in is only possible for published events");
        }
        if (now.isBefore(event.getStartsAt().minus(properties.opensBefore()))) {
            throw new ConflictException("Check-in opens " + properties.opensBefore().toHours()
                    + " hours before the event starts");
        }
        if (!now.isBefore(event.getEndsAt())) {
            throw new ConflictException("The event has ended");
        }

        String code = rawCode.trim().toUpperCase(Locale.ROOT);
        // One atomic statement decides who is first; everything below only explains a refusal.
        int updated = tickets.checkIn(code, eventId, organizerId, now);
        Ticket ticket = tickets.findByCodeAndEventId(code, eventId)
                .orElseThrow(() -> new NotFoundException("Ticket not found for this event"));
        if (updated == 0) {
            if (ticket.getStatus() == TicketStatus.CHECKED_IN) {
                throw new ConflictException("This ticket was already checked in at " + ticket.getCheckedInAt());
            }
            throw new ConflictException("This ticket is " + ticket.getStatus().name().toLowerCase(Locale.ROOT)
                    + " and cannot be used");
        }
        return CheckInResponse.from(ticket);
    }

    @Transactional(readOnly = true)
    public AttendanceResponse attendance(long organizerId, long eventId) {
        actors.requireRole(organizerId, Role.ORGANIZER);
        ownEvent(organizerId, eventId);
        Map<TicketStatus, Long> counts = new EnumMap<>(TicketStatus.class);
        for (TicketStatus status : TicketStatus.values()) {
            counts.put(status, 0L);
        }
        for (Object[] row : tickets.countByStatusForEvent(eventId)) {
            counts.put((TicketStatus) row[0], ((Number) row[1]).longValue());
        }
        long valid = counts.get(TicketStatus.VALID);
        long checkedIn = counts.get(TicketStatus.CHECKED_IN);
        long voided = counts.get(TicketStatus.VOID);
        return new AttendanceResponse(valid + checkedIn + voided, checkedIn, valid, voided);
    }

    private Event ownEvent(long organizerId, long eventId) {
        // Someone else's event looks exactly like one that does not exist.
        return events.findByIdAndOrganizerId(eventId, organizerId)
                .orElseThrow(() -> new NotFoundException("Event not found"));
    }
}