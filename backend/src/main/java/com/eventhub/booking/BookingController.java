package com.eventhub.booking;

import com.eventhub.common.PageResponse;
import com.eventhub.security.CurrentUser;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/bookings")
public class BookingController {

    private final BookingService bookingService;
    private final BookingQueryService queryService;
    private final BookingLifecycleService lifecycleService;

    public BookingController(BookingService bookingService, BookingQueryService queryService,
                             BookingLifecycleService lifecycleService) {
        this.bookingService = bookingService;
        this.queryService = queryService;
        this.lifecycleService = lifecycleService;
    }

    /** 201 for a new booking; 200 when an Idempotency-Key replay returns the original booking. */
    @PostMapping
    public ResponseEntity<BookingResponse> create(
            @AuthenticationPrincipal Jwt jwt,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @Valid @RequestBody CreateBookingRequest request) {
        BookingCreation result = bookingService.create(CurrentUser.id(jwt), request, idempotencyKey);
        return ResponseEntity.status(result.created() ? HttpStatus.CREATED : HttpStatus.OK).body(result.booking());
    }

    /** bucket: all (default), upcoming, past or cancelled. */
    @GetMapping("/my")
    public PageResponse<BookingSummaryResponse> mine(@AuthenticationPrincipal Jwt jwt,
                                                     @RequestParam(defaultValue = "all") String bucket,
                                                     @RequestParam(defaultValue = "0") int page,
                                                     @RequestParam(defaultValue = "10") int size) {
        return queryService.listMine(CurrentUser.id(jwt), bucket, page, size);
    }

    @GetMapping("/{id}")
    public BookingResponse get(@AuthenticationPrincipal Jwt jwt, @PathVariable long id) {
        return queryService.getMine(CurrentUser.id(jwt), id);
    }

    @PostMapping("/{id}/cancel")
    public BookingResponse cancel(@AuthenticationPrincipal Jwt jwt, @PathVariable long id) {
        return lifecycleService.cancel(CurrentUser.id(jwt), id);
    }
}