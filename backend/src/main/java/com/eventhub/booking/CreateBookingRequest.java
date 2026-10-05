package com.eventhub.booking;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

/**
 * Reserved-seating events: send seatIds. General-admission events: send items.
 * Note what is NOT here: prices, totals, currency, status and the customer. The server decides those.
 */
public record CreateBookingRequest(
        @NotNull Long eventId,
        @Size(max = 20) List<@NotNull Long> seatIds,
        @Size(max = 20) List<@Valid @NotNull Item> items) {

    public record Item(@NotNull Long ticketTypeId, @NotNull @Min(1) @Max(20) Integer quantity) {
    }
}