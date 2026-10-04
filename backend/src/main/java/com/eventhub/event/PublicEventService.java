package com.eventhub.event;

import com.eventhub.common.BadRequestException;
import com.eventhub.common.NotFoundException;
import com.eventhub.common.PageResponse;
import com.eventhub.common.Text;
import com.eventhub.venue.Venue;
import jakarta.persistence.criteria.Predicate;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PublicEventService {

    private static final int MAX_PAGE_SIZE = 50;
    private static final int MAX_SEARCH_LENGTH = 100;

    /** Clients choose a key; they never send raw field names. Every sort ends with id for stable paging. */
    private static final Map<String, Sort> SORTS = Map.of(
            "date", Sort.by(Sort.Direction.ASC, "startsAt").and(Sort.by(Sort.Direction.ASC, "id")),
            "date_desc", Sort.by(Sort.Direction.DESC, "startsAt").and(Sort.by(Sort.Direction.ASC, "id")),
            "price_asc", Sort.by(Sort.Direction.ASC, "startingPrice")
                    .and(Sort.by(Sort.Direction.ASC, "startsAt")).and(Sort.by(Sort.Direction.ASC, "id")),
            "price_desc", Sort.by(Sort.Direction.DESC, "startingPrice")
                    .and(Sort.by(Sort.Direction.ASC, "startsAt")).and(Sort.by(Sort.Direction.ASC, "id")),
            "newest", Sort.by(Sort.Direction.DESC, "createdAt").and(Sort.by(Sort.Direction.DESC, "id")));

    private final EventRepository events;
    private final TicketTypeRepository ticketTypes;

    public PublicEventService(EventRepository events, TicketTypeRepository ticketTypes) {
        this.events = events;
        this.ticketTypes = ticketTypes;
    }

    @Transactional(readOnly = true)
    public PageResponse<EventSummaryResponse> search(String q, String category, String city,
                                                     Instant from, Instant to,
                                                     BigDecimal minPrice, BigDecimal maxPrice,
                                                     String sortKey, int page, int size) {
        Sort sort = SORTS.get(sortKey);
        if (sort == null) {
            throw new BadRequestException("Unknown sort. Use one of: " + String.join(", ", SORTS.keySet()));
        }
        String text = Text.blankToNull(q);
        if (text != null && text.length() > MAX_SEARCH_LENGTH) {
            throw new BadRequestException("Search text is too long");
        }
        if (from != null && to != null && !to.isAfter(from)) {
            throw new BadRequestException("'to' must be after 'from'");
        }
        if ((minPrice != null && minPrice.signum() < 0) || (maxPrice != null && maxPrice.signum() < 0)) {
            throw new BadRequestException("Prices cannot be negative");
        }
        if (minPrice != null && maxPrice != null && minPrice.compareTo(maxPrice) > 0) {
            throw new BadRequestException("minPrice cannot be greater than maxPrice");
        }

        Specification<Event> spec = buildSpecification(Instant.now(), text,
                Text.blankToNull(category), Text.blankToNull(city), from, to, minPrice, maxPrice);
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), MAX_PAGE_SIZE), sort);
        return PageResponse.from(events.findAll(spec, pageable).map(EventSummaryResponse::from));
    }

    @Transactional(readOnly = true)
    public EventDetailResponse get(long eventId) {
        // Drafts and cancelled events look exactly like events that do not exist.
        Event event = events.findByIdAndStatus(eventId, EventStatus.PUBLISHED)
                .orElseThrow(() -> new NotFoundException("Event not found"));
        Instant now = Instant.now();

        List<EventDetailResponse.PublicTicketType> types = ticketTypes.findByEventIdOrderByIdAsc(eventId).stream()
                .map(type -> new EventDetailResponse.PublicTicketType(
                        type.getId(), type.getName(), type.getPrice(),
                        type.getQuantityTotal() == null ? null : type.getQuantityTotal() - type.getQuantitySold(),
                        type.getSeatSection(), type.getMaxPerBooking(),
                        type.getSalesStart(), type.getSalesEnd(),
                        SalesWindow.isOpen(type, event, now)))
                .toList();

        Venue venue = event.getVenue();
        return new EventDetailResponse(event.getId(), event.getTitle(), event.getDescription(),
                event.getCategory(), event.getImageUrl(), event.getStartsAt(), event.getEndsAt(),
                event.getSeatingMode(), event.getCurrency(), event.getCancellationCutoffHours(),
                event.getOrganizer().getFullName(),
                new EventDetailResponse.VenueInfo(venue.getName(), venue.getAddressLine(), venue.getCity(),
                        venue.getRegion(), venue.getCountry(), venue.getTimeZone()),
                types);
    }

    private static Specification<Event> buildSpecification(Instant now, String q, String category, String city,
                                                            Instant from, Instant to,
                                                            BigDecimal minPrice, BigDecimal maxPrice) {
        // Each filter is added only when the client supplied it.
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("status"), EventStatus.PUBLISHED));
            predicates.add(cb.greaterThan(root.<Instant>get("endsAt"), now)); // not yet over
            if (q != null) {
                String pattern = "%" + escapeLike(q.toLowerCase(Locale.ROOT)) + "%";
                predicates.add(cb.like(cb.lower(root.<String>get("title")), pattern, '\\'));
            }
            if (category != null) {
                predicates.add(cb.equal(cb.lower(root.<String>get("category")), category.toLowerCase(Locale.ROOT)));
            }
            if (city != null) {
                predicates.add(cb.equal(cb.lower(root.get("venue").<String>get("city")), city.toLowerCase(Locale.ROOT)));
            }
            if (from != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.<Instant>get("startsAt"), from));
            }
            if (to != null) {
                predicates.add(cb.lessThan(root.<Instant>get("startsAt"), to));
            }
            if (minPrice != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.<BigDecimal>get("startingPrice"), minPrice));
            }
            if (maxPrice != null) {
                predicates.add(cb.lessThanOrEqualTo(root.<BigDecimal>get("startingPrice"), maxPrice));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    /** In SQL LIKE, % and _ are wildcards; escape them so user text is matched literally. */
    private static String escapeLike(String text) {
        return text.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }
}