package com.eventhub.event;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.Instant;

/** The venue and seating mode are deliberately not editable after creation. */
public record UpdateEventRequest(
        @NotBlank @Size(max = 200) String title,
        @Size(max = 10000) String description,
        @NotBlank @Size(max = 50) String category,
        @Size(max = 500) @Pattern(regexp = "^https?://\\S+$", message = "must be an http or https URL") String imageUrl,
        @NotNull Instant startsAt,
        @NotNull Instant endsAt,
        @Min(0) @Max(720) Integer cancellationCutoffHours) {
}