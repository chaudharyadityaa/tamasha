package com.eventhub.event;

import java.time.Instant;

/** One place that decides whether a ticket type can be bought right now. */
public final class SalesWindow {

    private SalesWindow() {
    }

    /**
     * Sales open at salesStart (or immediately if not set) and close at salesEnd
     * (or when the event starts if not set). Only published events can sell.
     */
    public static boolean isOpen(TicketType type, Event event, Instant now) {
        if (event.getStatus() != EventStatus.PUBLISHED) {
            return false;
        }
        Instant opens = type.getSalesStart();
        Instant closes = type.getSalesEnd() != null ? type.getSalesEnd() : event.getStartsAt();
        return (opens == null || !now.isBefore(opens)) && now.isBefore(closes);
    }
}