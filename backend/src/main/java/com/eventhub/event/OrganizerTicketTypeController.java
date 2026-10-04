package com.eventhub.event;

import com.eventhub.security.CurrentUser;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/organizer/events/{eventId}/ticket-types")
public class OrganizerTicketTypeController {

    private final TicketTypeService ticketTypeService;

    public OrganizerTicketTypeController(TicketTypeService ticketTypeService) {
        this.ticketTypeService = ticketTypeService;
    }

    @PostMapping
    public ResponseEntity<TicketTypeResponse> create(@AuthenticationPrincipal Jwt jwt,
                                                     @PathVariable long eventId,
                                                     @Valid @RequestBody CreateTicketTypeRequest request) {
        TicketTypeResponse created = ticketTypeService.create(CurrentUser.id(jwt), eventId, request);
        return ResponseEntity.created(
                URI.create("/api/organizer/events/" + eventId + "/ticket-types/" + created.id())).body(created);
    }

    @GetMapping
    public List<TicketTypeResponse> list(@AuthenticationPrincipal Jwt jwt, @PathVariable long eventId) {
        return ticketTypeService.list(CurrentUser.id(jwt), eventId);
    }

    @DeleteMapping("/{ticketTypeId}")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal Jwt jwt, @PathVariable long eventId,
                                       @PathVariable long ticketTypeId) {
        ticketTypeService.delete(CurrentUser.id(jwt), eventId, ticketTypeId);
        return ResponseEntity.noContent().build();
    }
}