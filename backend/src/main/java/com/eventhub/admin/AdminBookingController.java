package com.eventhub.admin;

import com.eventhub.booking.BookingResponse;
import com.eventhub.booking.BookingStatus;
import com.eventhub.common.PageResponse;
import com.eventhub.security.CurrentUser;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/bookings")
public class AdminBookingController {

    private final AdminBookingService adminBookingService;

    public AdminBookingController(AdminBookingService adminBookingService) {
        this.adminBookingService = adminBookingService;
    }

    @GetMapping
    public PageResponse<AdminBookingResponse> list(@AuthenticationPrincipal Jwt jwt,
                                                   @RequestParam(required = false) BookingStatus status,
                                                   @RequestParam(required = false) Long eventId,
                                                   @RequestParam(required = false) String q,
                                                   @RequestParam(defaultValue = "0") int page,
                                                   @RequestParam(defaultValue = "20") int size) {
        return adminBookingService.list(CurrentUser.id(jwt), status, eventId, q, page, size);
    }

    @GetMapping("/{id}")
    public BookingResponse get(@AuthenticationPrincipal Jwt jwt, @PathVariable long id) {
        return adminBookingService.get(CurrentUser.id(jwt), id);
    }

    @PostMapping("/{id}/cancel")
    public BookingResponse cancel(@AuthenticationPrincipal Jwt jwt, @PathVariable long id) {
        return adminBookingService.cancel(CurrentUser.id(jwt), id);
    }
}