package com.eventhub.admin;

import com.eventhub.common.PageResponse;
import com.eventhub.event.EventStatus;
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
@RequestMapping("/api/admin/events")
public class AdminEventController {

    private final AdminEventService adminEventService;

    public AdminEventController(AdminEventService adminEventService) {
        this.adminEventService = adminEventService;
    }

    @GetMapping
    public PageResponse<AdminEventResponse> list(@AuthenticationPrincipal Jwt jwt,
                                                 @RequestParam(required = false) EventStatus status,
                                                 @RequestParam(required = false) Long organizerId,
                                                 @RequestParam(required = false) String q,
                                                 @RequestParam(defaultValue = "0") int page,
                                                 @RequestParam(defaultValue = "20") int size) {
        return adminEventService.list(CurrentUser.id(jwt), status, organizerId, q, page, size);
    }

    @PostMapping("/{id}/cancel")
    public AdminEventResponse cancel(@AuthenticationPrincipal Jwt jwt, @PathVariable long id) {
        return adminEventService.cancel(CurrentUser.id(jwt), id);
    }
}