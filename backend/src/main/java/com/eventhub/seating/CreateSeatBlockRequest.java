package com.eventhub.seating;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;

/** Creates seats numbered 1..seatsPerRow in each listed row of the section. */
public record CreateSeatBlockRequest(
        @NotBlank
        @Size(max = 50)
        @Pattern(regexp = "^[A-Za-z0-9 _-]+$",
                message = "may only contain letters, digits, spaces, hyphens and underscores")
        String section,

        @NotNull
        @Size(min = 1, max = 50)
        List<@Pattern(regexp = "^[A-Za-z0-9]{1,10}$", message = "must be 1-10 letters or digits") String> rows,

        @NotNull @Min(1) @Max(100) Integer seatsPerRow) {
}