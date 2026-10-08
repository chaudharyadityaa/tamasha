package com.eventhub.event;

/**
 * What the event module needs to ask the booking module. The booking module implements this,
 * so the event package never depends on the booking package (no circular dependency).
 */
public interface BookingGateway {

    /** Confirmed bookings, or unpaid ones whose hold has not run out. */
    boolean hasActiveBookings(long eventId);

    /** Does any booking, even a cancelled one, refer to this ticket type? */
    boolean isTicketTypeUsed(long ticketTypeId);

    /**
     * Cancels every open booking of the event (releasing seats and tickets, refunding demo payments).
     * Must be called inside a transaction.
     *
     * @return how many bookings were cancelled
     */
    int cancelAllBookings(long eventId);
}