package com.eventhub.admin;

import com.eventhub.booking.Booking;
import com.eventhub.booking.BookingInventory;
import com.eventhub.booking.BookingResponse;
import com.eventhub.booking.BookingStatus;
import com.eventhub.booking.Payment;
import com.eventhub.booking.PaymentRepository;
import com.eventhub.booking.PaymentStatus;
import com.eventhub.booking.TicketIssuer;
import com.eventhub.common.BadRequestException;
import com.eventhub.common.ConflictException;
import com.eventhub.common.NotFoundException;
import com.eventhub.common.PageResponse;
import com.eventhub.common.SqlLike;
import com.eventhub.common.Text;
import com.eventhub.security.ActorVerifier;
import com.eventhub.user.Role;
import jakarta.persistence.criteria.Predicate;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminBookingService {

    private static final int MAX_PAGE_SIZE = 100;
    private static final int MAX_SEARCH_LENGTH = 100;

    private final AdminBookingRepository bookings;
    private final PaymentRepository payments;
    private final BookingInventory inventory;
    private final TicketIssuer ticketIssuer;
    private final ActorVerifier actors;

    public AdminBookingService(AdminBookingRepository bookings, PaymentRepository payments,
                               BookingInventory inventory, TicketIssuer ticketIssuer, ActorVerifier actors) {
        this.bookings = bookings;
        this.payments = payments;
        this.inventory = inventory;
        this.ticketIssuer = ticketIssuer;
        this.actors = actors;
    }

    /** Optional filters: status, eventId, q (matches the booking reference or the customer's email). */
    @Transactional(readOnly = true)
    public PageResponse<AdminBookingResponse> list(long adminId, BookingStatus status, Long eventId,
                                                   String q, int page, int size) {
        actors.requireRole(adminId, Role.ADMIN);
        String text = Text.blankToNull(q);
        if (text != null && text.length() > MAX_SEARCH_LENGTH) {
            throw new BadRequestException("Search text is too long");
        }
        Specification<Booking> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            if (eventId != null) {
                predicates.add(cb.equal(root.get("event").<Long>get("id"), eventId));
            }
            if (text != null) {
                String pattern = SqlLike.contains(text);
                predicates.add(cb.or(
                        cb.like(cb.lower(root.<String>get("reference")), pattern, '\\'),
                        cb.like(cb.lower(root.get("user").<String>get("email")), pattern, '\\')));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
        PageRequest pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), MAX_PAGE_SIZE),
                Sort.by(Sort.Direction.DESC, "createdAt").and(Sort.by(Sort.Direction.DESC, "id")));
        Instant now = Instant.now();
        return PageResponse.from(bookings.findAll(spec, pageable).map(booking -> AdminBookingResponse.from(booking, now)));
    }

    @Transactional(readOnly = true)
    public BookingResponse get(long adminId, long bookingId) {
        actors.requireRole(adminId, Role.ADMIN);
        Booking booking = bookings.findById(bookingId)
                .orElseThrow(() -> new NotFoundException("Booking not found"));
        return respond(booking);
    }

    /**
     * Cancels any booking, ignoring the customer's cutoff window. Releases seats and tickets, voids
     * issued tickets and (demo-)refunds a paid booking.
     */
    @Transactional
    public BookingResponse cancel(long adminId, long bookingId) {
        actors.requireRole(adminId, Role.ADMIN);
        Booking booking = bookings.findByIdForUpdate(bookingId)
                .orElseThrow(() -> new NotFoundException("Booking not found"));
        if (booking.getStatus() == BookingStatus.CANCELLED) {
            return respond(booking); // already cancelled: repeating is harmless
        }
        if (booking.getStatus() == BookingStatus.EXPIRED) {
            throw new ConflictException("This booking has expired, so there is nothing to cancel");
        }
        boolean wasPaid = booking.getStatus() == BookingStatus.CONFIRMED;

        booking.cancel(Instant.now());
        inventory.releaseItems(booking);
        ticketIssuer.voidAll(booking);
        if (wasPaid) {
            payments.findFirstByBookingIdAndStatus(bookingId, PaymentStatus.SUCCEEDED)
                    .ifPresent(Payment::markRefunded); // a DEMO refund: no money actually moves
        }
        return respond(booking);
    }

    private BookingResponse respond(Booking booking) {
        return BookingResponse.from(booking,
                payments.findFirstByBookingIdOrderByIdDesc(booking.getId()).orElse(null));
    }
}