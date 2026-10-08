package com.eventhub.booking;

import java.time.Instant;

/** What the scanner shows at the door. Name only: no email or other contact details. */
public record CheckInResponse(Long ticketId, TicketStatus status, String holderName,
                              String ticketTypeName, TicketResponse.SeatInfo seat, Instant checkedInAt) {

    public static CheckInResponse from(Ticket ticket) {
        return new CheckInResponse(ticket.getId(), ticket.getStatus(),
                ticket.getBooking().getUser().getFullName(), ticket.getTicketType().getName(),
                TicketResponse.seatOf(ticket), ticket.getCheckedInAt());
    }
}