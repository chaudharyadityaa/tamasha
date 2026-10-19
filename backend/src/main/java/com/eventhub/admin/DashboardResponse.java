package com.eventhub.admin;

import com.eventhub.booking.BookingStatus;
import com.eventhub.booking.TicketStatus;
import com.eventhub.event.EventStatus;
import com.eventhub.user.Role;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;

public record DashboardResponse(Instant generatedAt, Users users, Events events, Bookings bookings,
                                Tickets tickets, List<RevenueLine> confirmedRevenue,
                                boolean demoPaymentsEnabled) {

    public record Users(long total, long disabled, Map<Role, Long> byRole) {
    }

    public record Events(long total, long upcomingPublished, Map<EventStatus, Long> byStatus) {
    }

    public record Bookings(long total, Map<BookingStatus, Long> byStatus) {
    }

    public record Tickets(long total, long valid, long checkedIn, long voided) {
    }

    /** The sum of confirmed bookings in one currency. With demo payments no real money moved. */
    public record RevenueLine(String currency, BigDecimal amount) {
    }
}