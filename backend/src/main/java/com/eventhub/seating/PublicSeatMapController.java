package com.eventhub.seating;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Public and read-only (covered by the existing GET /api/events/** rule). */
@RestController
@RequestMapping("/api/events/{eventId}/seats")
public class PublicSeatMapController {

    private final SeatMapService seatMapService;

    public PublicSeatMapController(SeatMapService seatMapService) {
        this.seatMapService = seatMapService;
    }

    @GetMapping
    public SeatMapResponse get(@PathVariable long eventId) {
        return seatMapService.get(eventId);
    }
}