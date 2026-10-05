package com.eventhub.booking;

import com.eventhub.event.TicketTypeRepository;
import java.util.Comparator;
import org.springframework.stereotype.Component;

/** Gives general-admission tickets back when a booking is cancelled or its hold expires. */
@Component
public class BookingInventory {

    private final TicketTypeRepository ticketTypes;

    public BookingInventory(TicketTypeRepository ticketTypes) {
        this.ticketTypes = ticketTypes;
    }

    public void releaseItems(Booking booking) {
        // Same id order as when reserving, so concurrent releases and reservations cannot deadlock.
        booking.getItems().stream()
                .sorted(Comparator.comparing(item -> item.getTicketType().getId()))
                .forEach(item -> {
                    if (ticketTypes.releaseQuantity(item.getTicketType().getId(), item.getQuantity()) == 0) {
                        throw new IllegalStateException("Ticket inventory is out of sync for booking "
                                + booking.getReference());
                    }
                });
    }
}