package com.eventhub.booking;

import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Component;

/** Creates the tickets of a confirmed booking, and voids them when the booking is cancelled. */
@Component
public class TicketIssuer {

    private final TicketRepository tickets;

    public TicketIssuer(TicketRepository tickets) {
        this.tickets = tickets;
    }

    /** Idempotent: a booking that already has tickets keeps exactly those. */
    public List<Ticket> issue(Booking booking) {
        if (tickets.existsByBookingId(booking.getId())) {
            return tickets.findByBookingId(booking.getId());
        }
        List<Ticket> issued = new ArrayList<>();
        for (BookingSeat seat : booking.getSeats()) {
            if (seat.isActive()) {
                issued.add(Ticket.forSeat(booking, seat));
            }
        }
        for (BookingItem item : booking.getItems()) {
            for (int i = 0; i < item.getQuantity(); i++) {
                issued.add(Ticket.forItem(booking, item));
            }
        }
        return tickets.saveAll(issued);
    }

    /** Unused tickets become VOID; tickets already used keep their CHECKED_IN record. */
    public void voidAll(Booking booking) {
        tickets.findByBookingId(booking.getId()).forEach(Ticket::markVoid);
    }
}