package com.eventhub.booking;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** The text read from a ticket's QR code. */
public record CheckInRequest(@NotBlank @Size(max = 40) String code) {
}