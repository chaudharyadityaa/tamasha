package com.eventhub.booking;

import static org.assertj.core.api.Assertions.assertThat;

import com.eventhub.TestcontainersConfiguration;
import com.eventhub.common.ConflictException;
import com.eventhub.event.Event;
import com.eventhub.event.EventRepository;
import com.eventhub.event.SeatingMode;
import com.eventhub.event.TicketType;
import com.eventhub.event.TicketTypeRepository;
import com.eventhub.user.Role;
import com.eventhub.user.User;
import com.eventhub.user.UserRepository;
import com.eventhub.venue.Seat;
import com.eventhub.venue.SeatRepository;
import com.eventhub.venue.Venue;
import com.eventhub.venue.VenueRepository;
import java.math.BigDecimal;
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
import java.util.stream.IntStream;
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
class BookingConcurrencyTest {

    @Autowired
    private BookingService bookingService;
    @Autowired
    private UserRepository users;
    @Autowired
    private VenueRepository venues;
    @Autowired
    private SeatRepository seats;
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
        jdbc.execute("TRUNCATE TABLE booking_seats, booking_items, bookings, ticket_types, seats, "
                + "events, venues, users RESTART IDENTITY CASCADE");
    }

    // ---------- helpers ----------

    private User saveUser(Role role, String name) {
        return users.saveAndFlush(new User(name + "@example.com", "hash", name, role));
    }

    private Event publishedEvent(User organizer, Venue venue, SeatingMode mode) {
        Instant start = Instant.now().plus(10, ChronoUnit.DAYS);
        Event event = events.saveAndFlush(new Event(organizer, venue, "Concert", null, "MUSIC", null,
                start, start.plus(3, ChronoUnit.HOURS), mode, "INR"));
        return event;
    }

    private void publish(Event event) {
        event.setStartingPrice(new BigDecimal("1.00"));
        event.publish();
        events.saveAndFlush(event);
    }

    private List<User> saveCustomers(int count) {
        return IntStream.rangeClosed(1, count).mapToObj(i -> saveUser(Role.CUSTOMER, "customer" + i)).toList();
    }

    private String attempt(long userId, CreateBookingRequest request, String key) {
        try {
            return bookingService.create(userId, request, key).created() ? "WON" : "REPLAY";
        } catch (ConflictException e) {
            return "CONFLICT";
        }
    }

    /** Starts every task at the same instant and returns all results. */
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

    // ---------- the tests ----------

    @Test
    void manyCustomersRacingForTheSameSeatProduceExactlyOneWinner() throws Exception {
        User organizer = saveUser(Role.ORGANIZER, "organizer");
        Venue venue = venues.saveAndFlush(new Venue(organizer, "City Hall", "1 Main Road", "Agra",
                null, "India", "Asia/Kolkata", 500));
        Seat seat = seats.saveAndFlush(new Seat(venue, "VIP", "A", "1"));
        Event event = publishedEvent(organizer, venue, SeatingMode.RESERVED_SEATING);
        ticketTypes.saveAndFlush(TicketType.reservedSection(event, "VIP", new BigDecimal("2500.00"),
                "VIP", 4, null, null));
        publish(event);
        CreateBookingRequest request = new CreateBookingRequest(event.getId(), List.of(seat.getId()), null);

        List<Callable<String>> tasks = new ArrayList<>();
        for (User customer : saveCustomers(8)) {
            tasks.add(() -> attempt(customer.getId(), request, null));
        }
        List<String> results = runConcurrently(tasks);

        assertThat(Collections.frequency(results, "WON")).isEqualTo(1);
        assertThat(Collections.frequency(results, "CONFLICT")).isEqualTo(7);
        assertThat(bookingSeats.countByEventIdAndReleasedAtIsNull(event.getId())).isEqualTo(1);
        assertThat(bookings.count()).isEqualTo(1);
    }

    @Test
    void generalAdmissionTicketsAreNeverOversoldUnderConcurrency() throws Exception {
        User organizer = saveUser(Role.ORGANIZER, "organizer");
        Venue venue = venues.saveAndFlush(new Venue(organizer, "City Hall", "1 Main Road", "Agra",
                null, "India", "Asia/Kolkata", 500));
        Event event = publishedEvent(organizer, venue, SeatingMode.GENERAL_ADMISSION);
        TicketType standing = ticketTypes.saveAndFlush(TicketType.generalAdmission(event, "Standing",
                new BigDecimal("100.00"), 10, 4, null, null)); // only 10 tickets exist
        publish(event);
        CreateBookingRequest request = new CreateBookingRequest(event.getId(), null,
                List.of(new CreateBookingRequest.Item(standing.getId(), 1)));

        List<Callable<String>> tasks = new ArrayList<>();
        for (User customer : saveCustomers(20)) { // 20 customers want 1 ticket each
            tasks.add(() -> attempt(customer.getId(), request, null));
        }
        List<String> results = runConcurrently(tasks);

        assertThat(Collections.frequency(results, "WON")).isEqualTo(10);
        assertThat(Collections.frequency(results, "CONFLICT")).isEqualTo(10);
        assertThat(ticketTypes.findById(standing.getId()).orElseThrow().getQuantitySold()).isEqualTo(10);
        assertThat(bookings.count()).isEqualTo(10);
    }

    @Test
    void simultaneousRequestsWithTheSameIdempotencyKeyCreateOneBooking() throws Exception {
        User organizer = saveUser(Role.ORGANIZER, "organizer");
        Venue venue = venues.saveAndFlush(new Venue(organizer, "City Hall", "1 Main Road", "Agra",
                null, "India", "Asia/Kolkata", 500));
        Event event = publishedEvent(organizer, venue, SeatingMode.GENERAL_ADMISSION);
        TicketType standing = ticketTypes.saveAndFlush(TicketType.generalAdmission(event, "Standing",
                new BigDecimal("100.00"), 100, 4, null, null));
        publish(event);
        User customer = saveCustomers(1).get(0);
        CreateBookingRequest request = new CreateBookingRequest(event.getId(), null,
                List.of(new CreateBookingRequest.Item(standing.getId(), 2)));

        List<Callable<String>> tasks = new ArrayList<>();
        for (int i = 0; i < 6; i++) { // the same customer double-clicks "Book" six times at once
            tasks.add(() -> attempt(customer.getId(), request, "double-click-key"));
        }
        List<String> results = runConcurrently(tasks);

        assertThat(Collections.frequency(results, "WON")).isEqualTo(1);
        assertThat(Collections.frequency(results, "REPLAY")).isEqualTo(5);
        assertThat(bookings.count()).isEqualTo(1);
        assertThat(ticketTypes.findById(standing.getId()).orElseThrow().getQuantitySold()).isEqualTo(2);
    }
}