package com.eventhub.admin;

import com.eventhub.booking.BookingStatus;
import com.eventhub.booking.TicketStatus;
import com.eventhub.event.EventStatus;
import com.eventhub.security.ActorVerifier;
import com.eventhub.user.Role;
import java.time.Instant;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminDashboardService {

    private final ActorVerifier actors;
    private final AdminStatsQueries queries;
    private final boolean demoPaymentsEnabled;

    public AdminDashboardService(ActorVerifier actors, AdminStatsQueries queries,
                                 @Value("${app.payments.demo-enabled:false}") boolean demoPaymentsEnabled) {
        this.actors = actors;
        this.queries = queries;
        this.demoPaymentsEnabled = demoPaymentsEnabled;
    }

    @Transactional(readOnly = true)
    public DashboardResponse dashboard(long adminId) {
        actors.requireRole(adminId, Role.ADMIN);
        Instant now = Instant.now();

        Map<Role, Long> usersByRole = queries.countsBy(
                "select u.role, count(u) from User u group by u.role", Role.class);
        Map<EventStatus, Long> eventsByStatus = queries.countsBy(
                "select e.status, count(e) from Event e group by e.status", EventStatus.class);
        Map<BookingStatus, Long> bookingsByStatus = queries.countsBy(
                "select b.status, count(b) from Booking b group by b.status", BookingStatus.class);
        Map<TicketStatus, Long> ticketsByStatus = queries.countsBy(
                "select t.status, count(t) from Ticket t group by t.status", TicketStatus.class);

        return new DashboardResponse(now,
                new DashboardResponse.Users(sum(usersByRole),
                        queries.count("select count(u) from User u where u.enabled = false"), usersByRole),
                new DashboardResponse.Events(sum(eventsByStatus),
                        queries.countAfter("select count(e) from Event e where e.status = "
                                + "com.eventhub.event.EventStatus.PUBLISHED and e.endsAt > :now", now),
                        eventsByStatus),
                new DashboardResponse.Bookings(sum(bookingsByStatus), bookingsByStatus),
                new DashboardResponse.Tickets(sum(ticketsByStatus), ticketsByStatus.get(TicketStatus.VALID),
                        ticketsByStatus.get(TicketStatus.CHECKED_IN), ticketsByStatus.get(TicketStatus.VOID)),
                queries.confirmedRevenue(), demoPaymentsEnabled);
    }

    private static long sum(Map<?, Long> counts) {
        return counts.values().stream().mapToLong(Long::longValue).sum();
    }
}