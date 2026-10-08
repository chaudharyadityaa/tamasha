package com.eventhub.booking;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/** Sales and occupancy numbers for one event (for the organizer dashboard). */
public record EventStatsResponse(Long eventId, String eventTitle, String currency,
                                 BigDecimal confirmedRevenue,
                                 Map<BookingStatus, Long> bookingsByStatus,
                                 Overall overall, List<TicketTypeStats> ticketTypes) {

    /** capacity = all tickets/seats on sale; held = unpaid but still reserved. */
    public record Overall(long capacity, long confirmed, long held, long available, double occupancyPercent) {
    }

    public record TicketTypeStats(Long ticketTypeId, String name, BigDecimal price, String seatSection,
                                  long capacity, long confirmed, long held, long available) {
    }
}