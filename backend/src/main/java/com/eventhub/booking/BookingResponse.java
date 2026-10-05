package com.eventhub.booking;

import com.eventhub.event.Event;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record BookingResponse(Long id, String reference, BookingStatus status, Long eventId,
                              String eventTitle, Instant eventStartsAt, String currency,
                              BigDecimal totalAmount, Instant expiresAt, Instant createdAt,
                              List<ItemLine> items, List<SeatLine> seats) {

    public record ItemLine(Long ticketTypeId, String ticketTypeName, int quantity,
                           BigDecimal unitPrice, BigDecimal lineTotal) {
    }

    public record SeatLine(Long seatId, String section, String row, String number,
                           String ticketTypeName, BigDecimal unitPrice) {
    }

    /** Must be called inside a transaction (it reads lazily loaded relations). */
    public static BookingResponse from(Booking booking) {
        Event event = booking.getEvent();
        List<ItemLine> items = booking.getItems().stream()
                .map(item -> new ItemLine(item.getTicketType().getId(), item.getTicketType().getName(),
                        item.getQuantity(), item.getUnitPrice(), item.getLineTotal()))
                .toList();
        List<SeatLine> seats = booking.getSeats().stream()
                .map(line -> new SeatLine(line.getSeat().getId(), line.getSeat().getSection(),
                        line.getSeat().getRowLabel(), line.getSeat().getSeatNumber(),
                        line.getTicketType().getName(), line.getUnitPrice()))
                .toList();
        return new BookingResponse(booking.getId(), booking.getReference(), booking.getStatus(),
                event.getId(), event.getTitle(), event.getStartsAt(), booking.getCurrency(),
                booking.getTotalAmount(), booking.getExpiresAt(), booking.getCreatedAt(), items, seats);
    }
}