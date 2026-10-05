package com.eventhub.seating;

public enum SeatStatus {
    AVAILABLE,
    /** Held by an unpaid booking whose hold has not expired. */
    HELD,
    /** Part of a confirmed booking. */
    BOOKED
}