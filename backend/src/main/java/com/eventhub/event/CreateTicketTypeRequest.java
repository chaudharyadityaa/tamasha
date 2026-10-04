package com.eventhub.event;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.Instant;

/**
 * General-admission events: send quantityTotal. Reserved-seating events: send seatSection.
 * (The service checks the combination against the event's seating mode.)
 */
public record CreateTicketTypeRequest(
        @NotBlank @Size(max = 100) String name,
        @NotNull @DecimalMin("0.00") @Digits(integer = 8, fraction = 2) BigDecimal price,
        @Min(1) @Max(1_000_000) Integer quantityTotal,
        @Size(max = 50) String seatSection,
        @Min(1) @Max(20) Integer maxPerBooking,
        Instant salesStart,
        Instant salesEnd) {
}