package com.eventhub.admin;

import com.eventhub.common.BadRequestException;
import com.eventhub.common.ConflictException;
import com.eventhub.common.NotFoundException;
import com.eventhub.common.PageResponse;
import com.eventhub.common.SqlLike;
import com.eventhub.common.Text;
import com.eventhub.event.BookingGateway;
import com.eventhub.event.Event;
import com.eventhub.event.EventStatus;
import com.eventhub.security.ActorVerifier;
import com.eventhub.user.Role;
import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.util.List;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminEventService {

    private static final int MAX_PAGE_SIZE = 100;
    private static final int MAX_SEARCH_LENGTH = 100;

    private final AdminEventRepository events;
    private final BookingGateway bookings;
    private final ActorVerifier actors;

    public AdminEventService(AdminEventRepository events, BookingGateway bookings, ActorVerifier actors) {
        this.events = events;
        this.bookings = bookings;
        this.actors = actors;
    }

    /** Every event in every status. Optional filters: status, organizerId, q (title). */
    @Transactional(readOnly = true)
    public PageResponse<AdminEventResponse> list(long adminId, EventStatus status, Long organizerId,
                                                 String q, int page, int size) {
        actors.requireRole(adminId, Role.ADMIN);
        String text = Text.blankToNull(q);
        if (text != null && text.length() > MAX_SEARCH_LENGTH) {
            throw new BadRequestException("Search text is too long");
        }
        Specification<Event> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            if (organizerId != null) {
                predicates.add(cb.equal(root.get("organizer").<Long>get("id"), organizerId));
            }
            if (text != null) {
                predicates.add(cb.like(cb.lower(root.<String>get("title")), SqlLike.contains(text), '\\'));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
        PageRequest pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), MAX_PAGE_SIZE),
                Sort.by(Sort.Direction.DESC, "createdAt").and(Sort.by(Sort.Direction.DESC, "id")));
        return PageResponse.from(events.findAll(spec, pageable).map(AdminEventResponse::from));
    }

    /** Cancels any event and, in the same transaction, every open booking of it. */
    @Transactional
    public AdminEventResponse cancel(long adminId, long eventId) {
        actors.requireRole(adminId, Role.ADMIN);
        Event event = events.findByIdForUpdate(eventId)
                .orElseThrow(() -> new NotFoundException("Event not found"));
        try {
            event.cancel();
        } catch (IllegalStateException e) {
            throw new ConflictException(e.getMessage());
        }
        bookings.cancelAllBookings(eventId); // releases seats and tickets, voids tickets, refunds demo payments
        return AdminEventResponse.from(event);
    }
}