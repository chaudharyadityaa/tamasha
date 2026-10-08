package com.eventhub.booking;

import static org.assertj.core.api.Assertions.assertThat;

import com.eventhub.TestcontainersConfiguration;
import com.eventhub.common.ConflictException;
import com.eventhub.common.NotFoundException;
import com.eventhub.event.Event;
import com.eventhub.event.EventRepository;
import com.eventhub.event.EventStatus;
import com.eventhub.event.OrganizerEventService;
import com.eventhub.event.SeatingMode;
import com.eventhub.event.TicketType;
import com.eventhub.event.TicketTypeRepository;
import com.eventhub.testsupport.TestFixtures;
import com.eventhub.user.Role;
import com.eventhub.user.User;
import com.eventhub.venue.Seat;
import com.eventhub.venue.Venue;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Set;
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
class EventCancellationConcurrencyTest {

    private static final Set<String> ALLOWED = Set.of("BOOKED", "CONFLICT", "NOT_FOUND", "CANCELLED");

    @Autowired
    private BookingService bookingService;
    @Autowired
    private OrganizerEventService eventService;
    @Autowired
    private TestFixtures fx;
    @Autowired
    private EventRepository events;
    @Autowired
    private TicketTypeRepository ticketTypes;
    @Autowired
    private BookingRepository bookings;
    @Autowired
    private BookingSeatRepository bookingSeats;
    @Autowired
    private JdbcTemplate jdbc;

    @BeforeEach
    @AfterEach
    void cleanDatabase() {
        jdbc.execute("TRUNCATE TABLE payments, booking_seats, booking_items, bookings, ticket_types, seats, "
                + "events, venues, users RESTART IDENTITY CASCADE");
    }

    private String attemptBooking(long userId, CreateBookingRequest request) {
        try {
            bookingService.create(userId, request, null);
            return "BOOKED";
        } catch (ConflictException e) {
            return "CONFLICT";
        } catch (NotFoundException e) {
            return "NOT_FOUND"; // the event was already cancelled
        }
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

    @Test
    void generalAdmissionBookingsRacingAnEventCancellationLeaveNothingStranded() throws Exception {
        User organizer = fx.user(Role.ORGANIZER);
        Venue venue = fx.venue(organizer);
        Event event = fx.draft(organizer, venue, SeatingMode.GENERAL_ADMISSION, Instant.now().plus(10, ChronoUnit.DAYS));
        TicketType type = fx.gaType(event, "Standing", "100.00", 100, 4);
        fx.publish(event);
        CreateBookingRequest request = new CreateBookingRequest(event.getId(), null,
                List.of(new CreateBookingRequest.Item(type.getId(), 2)));

        List<Callable<String>> tasks = new ArrayList<>();
        for (int i = 0; i < 6; i++) {
            User customer = fx.user(Role.CUSTOMER);
            tasks.add(() -> attemptBooking(customer.getId(), request));
        }
        tasks.add(() -> {
            eventService.cancel(organizer.getId(), event.getId());
            return "CANCELLED";
        });
        List<String> results = runConcurrently(tasks);

        assertThat(results).allMatch(ALLOWED::contains);
        assertThat(Collections.frequency(results, "CANCELLED")).isEqualTo(1);
        assertThat(events.findById(event.getId()).orElseThrow().getStatus()).isEqualTo(EventStatus.CANCELLED);
        // Every booking that succeeded was cancelled by the cascade: nothing is left open...
        assertThat(bookings.findAll()).allMatch(booking -> booking.getStatus() == BookingStatus.CANCELLED);
        assertThat((long) bookings.count()).isEqualTo(Collections.frequency(results, "BOOKED"));
        // ...and every ticket went back into inventory.
        assertThat(ticketTypes.findById(type.getId()).orElseThrow().getQuantitySold()).isZero();
    }

    @Test
    void seatBookingsRacingAnEventCancellationLeaveNoSeatHeld() throws Exception {
        User organizer = fx.user(Role.ORGANIZER);
        Venue venue = fx.venue(organizer);
        List<Seat> seats = new ArrayList<>();
        for (int i = 1; i <= 6; i++) {
            seats.add(fx.seat(venue, "VIP", "A", String.valueOf(i)));
        }
        Event event = fx.draft(organizer, venue, SeatingMode.RESERVED_SEATING, Instant.now().plus(10, ChronoUnit.DAYS));
        fx.sectionType(event, "VIP", "2500.00", "VIP");
        fx.publish(event);

        List<Callable<String>> tasks = new ArrayList<>();
        for (Seat seat : seats) {
            User customer = fx.user(Role.CUSTOMER);
            CreateBookingRequest request = new CreateBookingRequest(event.getId(), List.of(seat.getId()), null);
            tasks.add(() -> attemptBooking(customer.getId(), request));
        }
        tasks.add(() -> {
            eventService.cancel(organizer.getId(), event.getId());
            return "CANCELLED";
        });
        List<String> results = runConcurrently(tasks);

        assertThat(results).allMatch(ALLOWED::contains);
        assertThat(events.findById(event.getId()).orElseThrow().getStatus()).isEqualTo(EventStatus.CANCELLED);
        assertThat(bookings.findAll()).allMatch(booking -> booking.getStatus() == BookingStatus.CANCELLED);
        assertThat(bookingSeats.countByEventIdAndReleasedAtIsNull(event.getId())).isZero();
    }
}