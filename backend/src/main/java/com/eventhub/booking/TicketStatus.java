package com.eventhub.booking;

public enum TicketStatus {
    /** Can be used to enter. */
    VALID,
    /** Already used to enter. */
    CHECKED_IN,
    /** The booking or event was cancelled. */
    VOID
}