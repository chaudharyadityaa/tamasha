package com.eventhub.booking;

import com.eventhub.common.PageResponse;
import com.eventhub.security.CurrentUser;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/organizer/events/{eventId}")
public class OrganizerBookingController {

    private final OrganizerBookingService service;

    public OrganizerBookingController(OrganizerBookingService service) {
        this.service = service;
    }

    @GetMapping("/bookings")
    public PageResponse<OrganizerBookingResponse> bookings(@AuthenticationPrincipal Jwt jwt,
                                                           @PathVariable long eventId,
                                                           @RequestParam(defaultValue = "0") int page,
                                                           @RequestParam(defaultValue = "20") int size) {
        return service.list(CurrentUser.id(jwt), eventId, page, size);
    }

    @GetMapping("/stats")
    public EventStatsResponse stats(@AuthenticationPrincipal Jwt jwt, @PathVariable long eventId) {
        return service.stats(CurrentUser.id(jwt), eventId);
    }
}