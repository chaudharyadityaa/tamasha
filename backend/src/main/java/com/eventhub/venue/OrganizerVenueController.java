package com.eventhub.venue;

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
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/organizer/venues")
public class OrganizerVenueController {

    private final VenueService venueService;

    public OrganizerVenueController(VenueService venueService) {
        this.venueService = venueService;
    }

    @PostMapping
    public ResponseEntity<VenueResponse> create(@AuthenticationPrincipal Jwt jwt,
                                                @Valid @RequestBody CreateVenueRequest request) {
        VenueResponse created = venueService.create(CurrentUser.id(jwt), request);
        return ResponseEntity.created(URI.create("/api/organizer/venues/" + created.id())).body(created);
    }

    @GetMapping
    public PageResponse<VenueResponse> list(@AuthenticationPrincipal Jwt jwt,
                                            @RequestParam(defaultValue = "0") int page,
                                            @RequestParam(defaultValue = "20") int size) {
        return venueService.listMine(CurrentUser.id(jwt), page, size);
    }

    @GetMapping("/{id}")
    public VenueResponse get(@AuthenticationPrincipal Jwt jwt, @PathVariable long id) {
        return venueService.getMine(CurrentUser.id(jwt), id);
    }
}