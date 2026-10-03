package com.eventhub.event;

import com.eventhub.common.PageResponse;
import com.eventhub.security.CurrentUser;
import jakarta.validation.Valid;
import java.net.URI;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/organizer/events")
public class OrganizerEventController {

    private final OrganizerEventService eventService;

    public OrganizerEventController(OrganizerEventService eventService) {
        this.eventService = eventService;
    }

    @PostMapping
    public ResponseEntity<EventResponse> create(@AuthenticationPrincipal Jwt jwt,
                                                @Valid @RequestBody CreateEventRequest request) {
        EventResponse created = eventService.create(CurrentUser.id(jwt), request);
        return ResponseEntity.created(URI.create("/api/organizer/events/" + created.id())).body(created);
    }

    @GetMapping
    public PageResponse<EventResponse> list(@AuthenticationPrincipal Jwt jwt,
                                            @RequestParam(required = false) EventStatus status,
                                            @RequestParam(defaultValue = "0") int page,
                                            @RequestParam(defaultValue = "20") int size) {
        return eventService.listMine(CurrentUser.id(jwt), status, page, size);
    }

    @GetMapping("/{id}")
    public EventResponse get(@AuthenticationPrincipal Jwt jwt, @PathVariable long id) {
        return eventService.getMine(CurrentUser.id(jwt), id);
    }

    @PutMapping("/{id}")
    public EventResponse update(@AuthenticationPrincipal Jwt jwt, @PathVariable long id,
                                @Valid @RequestBody UpdateEventRequest request) {
        return eventService.update(CurrentUser.id(jwt), id, request);
    }

    @PostMapping("/{id}/publish")
    public EventResponse publish(@AuthenticationPrincipal Jwt jwt, @PathVariable long id) {
        return eventService.publish(CurrentUser.id(jwt), id);
    }

    @PostMapping("/{id}/unpublish")
    public EventResponse unpublish(@AuthenticationPrincipal Jwt jwt, @PathVariable long id) {
        return eventService.unpublish(CurrentUser.id(jwt), id);
    }

    @PostMapping("/{id}/cancel")
    public EventResponse cancel(@AuthenticationPrincipal Jwt jwt, @PathVariable long id) {
        return eventService.cancel(CurrentUser.id(jwt), id);
    }
}