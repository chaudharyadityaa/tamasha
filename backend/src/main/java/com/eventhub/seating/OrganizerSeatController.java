package com.eventhub.seating;

import com.eventhub.security.CurrentUser;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
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
@RequestMapping("/api/organizer/venues/{venueId}")
public class OrganizerSeatController {

    private final SeatService seatService;

    public OrganizerSeatController(SeatService seatService) {
        this.seatService = seatService;
    }

    @PostMapping("/seat-blocks")
    public ResponseEntity<SeatBlockResponse> createBlock(@AuthenticationPrincipal Jwt jwt,
                                                         @PathVariable long venueId,
                                                         @Valid @RequestBody CreateSeatBlockRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(seatService.createBlock(CurrentUser.id(jwt), venueId, request));
    }

    @GetMapping("/seat-sections")
    public List<SeatSectionResponse> listSections(@AuthenticationPrincipal Jwt jwt, @PathVariable long venueId) {
        return seatService.listSections(CurrentUser.id(jwt), venueId);
    }

    @DeleteMapping("/seat-sections/{section}")
    public ResponseEntity<Void> deleteSection(@AuthenticationPrincipal Jwt jwt,
                                              @PathVariable long venueId,
                                              @PathVariable String section) {
        seatService.deleteSection(CurrentUser.id(jwt), venueId, section);
        return ResponseEntity.noContent().build();
    }
}