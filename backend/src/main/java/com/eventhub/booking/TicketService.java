package com.eventhub.booking;

import com.eventhub.common.ConflictException;
import com.eventhub.common.NotFoundException;
import com.eventhub.security.ActorVerifier;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TicketService {

    private static final int QR_SIZE_PIXELS = 320;

    private final ActorVerifier actors;
    private final BookingRepository bookings;
    private final TicketRepository tickets;
    private final QrCodeService qrCodes;

    public TicketService(ActorVerifier actors, BookingRepository bookings,
                         TicketRepository tickets, QrCodeService qrCodes) {
        this.actors = actors;
        this.bookings = bookings;
        this.tickets = tickets;
        this.qrCodes = qrCodes;
    }

    /** Empty until the booking is paid. */
    @Transactional(readOnly = true)
    public List<TicketResponse> forBooking(long userId, long bookingId) {
        actors.requireActive(userId);
        bookings.findByIdAndUserId(bookingId, userId)
                .orElseThrow(() -> new NotFoundException("Booking not found"));
        return tickets.findByBookingIdOrderByIdAsc(bookingId).stream().map(TicketResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public TicketResponse get(long userId, long ticketId) {
        return TicketResponse.from(ownTicket(userId, ticketId));
    }

    /** A QR code exists only for tickets that can still be used. */
    @Transactional(readOnly = true)
    public byte[] qrPng(long userId, long ticketId) {
        Ticket ticket = ownTicket(userId, ticketId);
        if (ticket.getStatus() != TicketStatus.VALID) {
            throw new ConflictException("This ticket is " + ticket.getStatus().name().toLowerCase()
                    + " and has no QR code");
        }
        return qrCodes.png(ticket.getCode(), QR_SIZE_PIXELS);
    }

    private Ticket ownTicket(long userId, long ticketId) {
        actors.requireActive(userId);
        // Someone else's ticket looks exactly like one that does not exist.
        return tickets.findByIdAndBookingUserId(ticketId, userId)
                .orElseThrow(() -> new NotFoundException("Ticket not found"));
    }
}