package com.eventhub.seating;

import java.math.BigDecimal;
import java.util.List;

/** The public seat map of a reserved-seating event, grouped by ticket section. */
public record SeatMapResponse(Long eventId, String currency, List<Section> sections) {

    public record Section(Long ticketTypeId, String name, String section, BigDecimal price,
                          boolean onSale, List<SeatView> seats) {
    }

    public record SeatView(Long id, String row, String number, SeatStatus status) {
    }
}