package com.eventhub.booking;

import com.eventhub.common.BadRequestException;
import com.eventhub.common.NotFoundException;
import com.eventhub.common.PageResponse;
import com.eventhub.security.ActorVerifier;
import java.time.Instant;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class BookingQueryService {

    private static final int MAX_PAGE_SIZE = 50;

    private final BookingRepository bookings;
    private final PaymentRepository payments;
    private final ActorVerifier actors;

    public BookingQueryService(BookingRepository bookings, PaymentRepository payments, ActorVerifier actors) {
        this.bookings = bookings;
        this.payments = payments;
        this.actors = actors;
    }

    @Transactional(readOnly = true)
    public PageResponse<BookingSummaryResponse> listMine(long userId, String bucket, int page, int size) {
        actors.requireActive(userId);
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), MAX_PAGE_SIZE),
                Sort.by(Sort.Direction.DESC, "createdAt").and(Sort.by(Sort.Direction.DESC, "id")));
        Instant now = Instant.now();
        Page<Booking> result = switch (bucket) {
            case "all" -> bookings.findByUserId(userId, pageable);
            case "upcoming" -> bookings.findUpcoming(userId, now, pageable);
            case "past" -> bookings.findPast(userId, now, pageable);
            case "cancelled" -> bookings.findCancelledOrExpired(userId, now, pageable);
            default -> throw new BadRequestException("bucket must be one of: all, upcoming, past, cancelled");
        };
        return PageResponse.from(result.map(booking -> BookingSummaryResponse.from(booking, now)));
    }

    @Transactional(readOnly = true)
    public BookingResponse getMine(long userId, long bookingId) {
        actors.requireActive(userId);
        // Someone else's booking looks exactly like one that does not exist.
        Booking booking = bookings.findByIdAndUserId(bookingId, userId)
                .orElseThrow(() -> new NotFoundException("Booking not found"));
        return BookingResponse.from(booking, payments.findFirstByBookingIdOrderByIdDesc(bookingId).orElse(null));
    }
}