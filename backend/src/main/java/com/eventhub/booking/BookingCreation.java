package com.eventhub.booking;

/** The booking, plus whether this call created it (false means an idempotent replay). */
public record BookingCreation(BookingResponse booking, boolean created) {
}