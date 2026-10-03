package com.eventhub.venue;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateVenueRequest(
        @NotBlank @Size(max = 150) String name,
        @NotBlank @Size(max = 255) String addressLine,
        @NotBlank @Size(max = 100) String city,
        @Size(max = 100) String region,
        @NotBlank @Size(max = 100) String country,
        @NotBlank @Size(max = 64) String timeZone,
        @NotNull @Min(1) @Max(1_000_000) Integer capacity) {
}