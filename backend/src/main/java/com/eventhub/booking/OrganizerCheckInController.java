package com.eventhub.booking;

import com.eventhub.security.CurrentUser;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/organizer/events/{eventId}")
public class OrganizerCheckInController {

    private final CheckInService checkInService;

    public OrganizerCheckInController(CheckInService checkInService) {
        this.checkInService = checkInService;
    }

    @PostMapping("/check-ins")
    public CheckInResponse checkIn(@AuthenticationPrincipal Jwt jwt, @PathVariable long eventId,
                                   @Valid @RequestBody CheckInRequest request) {
        return checkInService.checkIn(CurrentUser.id(jwt), eventId, request.code());
    }

    @GetMapping("/attendance")
    public AttendanceResponse attendance(@AuthenticationPrincipal Jwt jwt, @PathVariable long eventId) {
        return checkInService.attendance(CurrentUser.id(jwt), eventId);
    }
}