package com.eventhub.booking;

import static org.assertj.core.api.Assertions.assertThat;

import com.eventhub.TestcontainersConfiguration;
import com.eventhub.common.ConflictException;
import com.eventhub.event.Event;
import com.eventhub.event.SeatingMode;
import com.eventhub.event.TicketType;
import com.eventhub.testsupport.TestFixtures;
import com.eventhub.user.Role;
import com.eventhub.user.User;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@Import(TestcontainersConfiguration.class)
@ActiveProfiles("test")
class TicketCheckInConcurrencyTest {

    @Autowired
    private TestFixtures fx;
    @Autowired
    private BookingService bookingService;
    @Autowired
    private DemoPaymentService demoPayments;
    @Autowired
    private CheckInService checkInService;
    @Autowired
    private TicketRepository tickets;
    @Autowired
    private JdbcTemplate jdbc;

    @BeforeEach
    @AfterEach
    void cleanDatabase() {
        jdbc.execute("TRUNCATE TABLE tickets, payments, booking_seats, booking_items, bookings, ticket_types, "
                + "seats, events, venues, users RESTART IDENTITY CASCADE");
    }

    @Test
    void manyScannersRacingForOneTicketAdmitItsHolderExactlyOnce() throws Exception {
        User organizer = fx.user(Role.ORGANIZER);
        Event event = fx.draft(organizer, fx.venue(organizer), SeatingMode.GENERAL_ADMISSION,
                Instant.now().plus(1, ChronoUnit.HOURS));
        TicketType type = fx.gaType(event, "Standing", "100.00", 100, 4);
        fx.publish(event);
        User customer = fx.user(Role.CUSTOMER);
        long bookingId = bookingService.create(customer.getId(), new CreateBookingRequest(event.getId(), null,
                List.of(new CreateBookingRequest.Item(type.getId(), 1))), null).booking().id();
        demoPayments.pay(customer.getId(), bookingId);
        String code = tickets.findByBookingId(bookingId).get(0).getCode();

        List<Callable<String>> scanners = new ArrayList<>();
        for (int i = 0; i < 8; i++) {
            scanners.add(() -> {
                try {
                    checkInService.checkIn(organizer.getId(), event.getId(), code);
                    return "ADMITTED";
                } catch (ConflictException e) {
                    return "REFUSED";
                }
            });
        }
        List<String> results = runConcurrently(scanners);

        assertThat(Collections.frequency(results, "ADMITTED")).isEqualTo(1);
        assertThat(Collections.frequency(results, "REFUSED")).isEqualTo(7);
        Ticket stored = tickets.findByBookingId(bookingId).get(0);
        assertThat(stored.getStatus()).isEqualTo(TicketStatus.CHECKED_IN);
        assertThat(stored.getCheckedInAt()).isNotNull();
    }

    private List<String> runConcurrently(List<Callable<String>> tasks) throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(tasks.size());
        try {
            CountDownLatch ready = new CountDownLatch(tasks.size());
            CountDownLatch go = new CountDownLatch(1);
            List<Future<String>> futures = new ArrayList<>();
            for (Callable<String> task : tasks) {
                futures.add(pool.submit(() -> {
                    ready.countDown();
                    go.await();
                    return task.call();
                }));
            }
            assertThat(ready.await(30, TimeUnit.SECONDS)).isTrue();
            go.countDown();
            List<String> results = new ArrayList<>();
            for (Future<String> future : futures) {
                results.add(future.get(60, TimeUnit.SECONDS));
            }
            return results;
        } finally {
            pool.shutdownNow();
        }
    }
}