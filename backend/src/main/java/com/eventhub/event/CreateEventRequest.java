package com.eventhub.event;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.Instant;

public record CreateEventRequest(
        @NotNull Long venueId,
        @NotBlank @Size(max = 200) String title,
        @Size(max = 10000) String description,
        @NotBlank @Size(max = 50) String category,
        @Size(max = 500) @Pattern(regexp = "^https?://\\S+$", message = "must be an http or https URL") String imageUrl,
        @NotNull Instant startsAt,
        @NotNull Instant endsAt,
        @NotNull SeatingMode seatingMode,
        @Pattern(regexp = "^[A-Z]{3}$", message = "must be a 3-letter code such as INR") String currency,
        @Min(0) @Max(720) Integer cancellationCutoffHours) {
}