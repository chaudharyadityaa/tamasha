package com.eventhub.booking;

import com.eventhub.event.Event;
import com.eventhub.venue.Seat;
import com.eventhub.venue.Venue;
import java.math.BigDecimal;
import java.time.Instant;

/** Everything a printable ticket page needs. qrAvailable is true only for tickets that can still be used. */
public record TicketResponse(Long id, String code, TicketStatus status, boolean qrAvailable,
                             String bookingReference, Long eventId, String eventTitle,
                             Instant eventStartsAt, Instant eventEndsAt, VenueInfo venue,
                             String ticketTypeName, BigDecimal price, String currency,
                             SeatInfo seat, Instant checkedInAt) {

    public record VenueInfo(String name, String addressLine, String city, String timeZone) {
    }

    /** Null on the ticket for general admission. */
    public record SeatInfo(String section, String row, String number) {
    }

    /** Must be called inside a transaction (it reads lazily loaded relations). */
    public static TicketResponse from(Ticket ticket) {
        Event event = ticket.getEvent();
        Venue venue = event.getVenue();
        return new TicketResponse(ticket.getId(), ticket.getCode(), ticket.getStatus(),
                ticket.getStatus() == TicketStatus.VALID, ticket.getBooking().getReference(),
                event.getId(), event.getTitle(), event.getStartsAt(), event.getEndsAt(),
                new VenueInfo(venue.getName(), venue.getAddressLine(), venue.getCity(), venue.getTimeZone()),
                ticket.getTicketType().getName(), ticket.getUnitPrice(), event.getCurrency(),
                seatOf(ticket), ticket.getCheckedInAt());
    }

    static SeatInfo seatOf(Ticket ticket) {
        if (ticket.getBookingSeat() == null) {
            return null;
        }
        Seat seat = ticket.getBookingSeat().getSeat();
        return new SeatInfo(seat.getSection(), seat.getRowLabel(), seat.getSeatNumber());
    }
}