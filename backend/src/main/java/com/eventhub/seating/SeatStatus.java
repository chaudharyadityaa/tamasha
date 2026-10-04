package com.eventhub.seating;

/** BOOKED is filled in by the booking checkpoint; until then every seat is AVAILABLE. */
public enum SeatStatus {
    AVAILABLE,
    BOOKED
}