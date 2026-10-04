package com.eventhub.event;

import java.math.BigDecimal;
import java.time.Instant;

public record TicketTypeResponse(Long id, String name, BigDecimal price, Integer quantityTotal,
                                 int quantitySold, Integer quantityRemaining, String seatSection,
                                 int maxPerBooking, Instant salesStart, Instant salesEnd) {

    public static TicketTypeResponse from(TicketType type) {
        Integer remaining = type.getQuantityTotal() == null
                ? null
                : type.getQuantityTotal() - type.getQuantitySold();
        return new TicketTypeResponse(type.getId(), type.getName(), type.getPrice(),
                type.getQuantityTotal(), type.getQuantitySold(), remaining, type.getSeatSection(),
                type.getMaxPerBooking(), type.getSalesStart(), type.getSalesEnd());
    }
}