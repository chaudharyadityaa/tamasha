package com.eventhub.booking;

import com.eventhub.security.CurrentUser;
import java.util.List;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class TicketController {

    private final TicketService ticketService;

    public TicketController(TicketService ticketService) {
        this.ticketService = ticketService;
    }

    @GetMapping("/api/bookings/{bookingId}/tickets")
    public List<TicketResponse> forBooking(@AuthenticationPrincipal Jwt jwt, @PathVariable long bookingId) {
        return ticketService.forBooking(CurrentUser.id(jwt), bookingId);
    }

    @GetMapping("/api/tickets/{id}")
    public TicketResponse get(@AuthenticationPrincipal Jwt jwt, @PathVariable long id) {
        return ticketService.get(CurrentUser.id(jwt), id);
    }

    @GetMapping("/api/tickets/{id}/qr.png")
    public ResponseEntity<byte[]> qr(@AuthenticationPrincipal Jwt jwt, @PathVariable long id) {
        byte[] png = ticketService.qrPng(CurrentUser.id(jwt), id);
        return ResponseEntity.ok()
                .contentType(MediaType.IMAGE_PNG)
                .cacheControl(CacheControl.noStore())
                .body(png);
    }
}