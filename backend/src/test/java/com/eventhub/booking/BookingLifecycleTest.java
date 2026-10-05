package com.eventhub.booking;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.eventhub.TestcontainersConfiguration;
import com.eventhub.event.Event;
import com.eventhub.event.SeatingMode;
import com.eventhub.event.TicketType;
import com.eventhub.testsupport.TestFixtures;
import com.eventhub.user.Role;
import com.eventhub.user.User;
import com.eventhub.user.UserRepository;
import com.eventhub.venue.Seat;
import com.eventhub.venue.Venue;
import com.jayway.jsonpath.JsonPath;
import jakarta.persistence.EntityManager;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@ActiveProfiles("test")
@Transactional
class BookingLifecycleTest {

    private final Instant now = Instant.now();

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private TestFixtures fx;
    @Autowired
    private UserRepository users;
    @Autowired
    private BookingRepository bookings;
    @Autowired
    private PaymentRepository payments;
    @Autowired
    private JdbcTemplate jdbc;
    @Autowired
    private EntityManager em;

    // ---------- helpers ----------

    private ResultActions post(User user, String url) throws Exception {
        return mockMvc.perform(MockMvcRequestBuilders.post(url).header("Authorization", fx.bearer(user)));
    }

    private ResultActions getAs(User user, String url) throws Exception {
        return mockMvc.perform(get(url).header("Authorization", fx.bearer(user)));
    }

    private long createGaBooking(User user, Event event, TicketType type, int quantity) throws Exception {
        String json = """
                {"eventId":%d,"items":[{"ticketTypeId":%d,"quantity":%d}]}
                """.formatted(event.getId(), type.getId(), quantity);
        String body = mockMvc.perform(MockMvcRequestBuilders.post("/api/bookings")
                        .header("Authorization", fx.bearer(user))
                        .contentType(MediaType.APPLICATION_JSON).content(json))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return ((Number) JsonPath.read(body, "$.id")).longValue();
    }

    private ResultActions tryBookSeat(User user, Event event, Seat seat) throws Exception {
        String json = """
                {"eventId":%d,"seatIds":[%d]}
                """.formatted(event.getId(), seat.getId());
        return mockMvc.perform(MockMvcRequestBuilders.post("/api/bookings")
                .header("Authorization", fx.bearer(user))
                .contentType(MediaType.APPLICATION_JSON).content(json));
    }

    private long createSeatBooking(User user, Event event, Seat seat) throws Exception {
        String body = tryBookSeat(user, event, seat).andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return ((Number) JsonPath.read(body, "$.id")).longValue();
    }

    private Event publishedGaEvent(User organizer, Instant start, TicketTypeHolder holder) {
        Event event = fx.draft(organizer, fx.venue(organizer), SeatingMode.GENERAL_ADMISSION, start);
        holder.type = fx.gaType(event, "Standing", "100.00", 100, 4);
        return fx.publish(event);
    }

    /** Tiny holder so a helper can return both the event and its ticket type. */
    private static class TicketTypeHolder {
        TicketType type;
    }

    // ---------- payment ----------

    @Test
    void demoPaymentConfirmsTheBookingAndIsLabeledAsDemo() throws Exception {
        User organizer = fx.user(Role.ORGANIZER);
        TicketTypeHolder h = new TicketTypeHolder();
        Event event = publishedGaEvent(organizer, now.plus(10, ChronoUnit.DAYS), h);
        User customer = fx.user(Role.CUSTOMER);
        long bookingId = createGaBooking(customer, event, h.type, 2);

        post(customer, "/api/bookings/" + bookingId + "/demo-payment")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CONFIRMED"))
                .andExpect(jsonPath("$.payment.provider").value("DEMO"))
                .andExpect(jsonPath("$.payment.status").value("SUCCEEDED"))
                .andExpect(jsonPath("$.payment.demo").value(true));

        assertThat(payments.findByBookingId(bookingId)).hasSize(1);
    }

    @Test
    void payingTwiceDoesNotCreateASecondPayment() throws Exception {
        User organizer = fx.user(Role.ORGANIZER);
        TicketTypeHolder h = new TicketTypeHolder();
        Event event = publishedGaEvent(organizer, now.plus(10, ChronoUnit.DAYS), h);
        User customer = fx.user(Role.CUSTOMER);
        long bookingId = createGaBooking(customer, event, h.type, 1);

        post(customer, "/api/bookings/" + bookingId + "/demo-payment").andExpect(status().isOk());
        post(customer, "/api/bookings/" + bookingId + "/demo-payment")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CONFIRMED"));

        assertThat(payments.findByBookingId(bookingId)).hasSize(1);
    }

    @Test
    void nobodyCanPayAnotherCustomersBooking() throws Exception {
        User organizer = fx.user(Role.ORGANIZER);
        TicketTypeHolder h = new TicketTypeHolder();
        Event event = publishedGaEvent(organizer, now.plus(10, ChronoUnit.DAYS), h);
        long bookingId = createGaBooking(fx.user(Role.CUSTOMER), event, h.type, 1);

        post(fx.user(Role.CUSTOMER), "/api/bookings/" + bookingId + "/demo-payment")
                .andExpect(status().isNotFound());

        assertThat(payments.findByBookingId(bookingId)).isEmpty();
    }

    @Test
    void expiredAndCancelledBookingsCannotBePaid() throws Exception {
        User organizer = fx.user(Role.ORGANIZER);
        TicketTypeHolder h = new TicketTypeHolder();
        Event event = publishedGaEvent(organizer, now.plus(10, ChronoUnit.DAYS), h);
        User customer = fx.user(Role.CUSTOMER);

        Booking stale = new Booking(customer, event, BookingReference.generate(), now.minus(1, ChronoUnit.MINUTES));
        stale.addItem(h.type, 1);
        bookings.saveAndFlush(stale);
        post(customer, "/api/bookings/" + stale.getId() + "/demo-payment").andExpect(status().isConflict());

        long cancelledId = createGaBooking(customer, event, h.type, 1);
        post(customer, "/api/bookings/" + cancelledId + "/cancel").andExpect(status().isOk());
        post(customer, "/api/bookings/" + cancelledId + "/demo-payment").andExpect(status().isConflict());

        assertThat(payments.count()).isZero();
    }

    @Test
    void paidSeatsShowAsBookedOnTheSeatMap() throws Exception {
        User organizer = fx.user(Role.ORGANIZER);
        Venue venue = fx.venue(organizer);
        Seat a1 = fx.seat(venue, "VIP", "A", "1");
        Event event = fx.draft(organizer, venue, SeatingMode.RESERVED_SEATING, now.plus(10, ChronoUnit.DAYS));
        fx.sectionType(event, "VIP", "2500.00", "VIP");
        fx.publish(event);
        User customer = fx.user(Role.CUSTOMER);
        long bookingId = createSeatBooking(customer, event, a1);

        post(customer, "/api/bookings/" + bookingId + "/demo-payment").andExpect(status().isOk());

        em.flush(); // write the CONFIRMED status to the database before forgetting cached objects
        em.clear();
        mockMvc.perform(get("/api/events/{id}/seats", event.getId()))
                .andExpect(jsonPath("$.sections[0].seats[0].status").value("BOOKED"));
    }

    // ---------- cancellation ----------

    @Test
    void cancellingAnUnpaidBookingReturnsTicketsAndIsRepeatable() throws Exception {
        User organizer = fx.user(Role.ORGANIZER);
        TicketTypeHolder h = new TicketTypeHolder();
        Event event = publishedGaEvent(organizer, now.plus(10, ChronoUnit.DAYS), h);
        User customer = fx.user(Role.CUSTOMER);
        long bookingId = createGaBooking(customer, event, h.type, 3);

        post(customer, "/api/bookings/" + bookingId + "/cancel")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELLED"));
        post(customer, "/api/bookings/" + bookingId + "/cancel")   // repeating is harmless
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELLED"));

        em.clear();
        mockMvc.perform(get("/api/events/{id}", event.getId()))
                .andExpect(jsonPath("$.ticketTypes[0].quantityRemaining").value(100));
    }

    @Test
    void cancellingAPaidBookingRefundsTheDemoPaymentAndFreesTheSeat() throws Exception {
        User organizer = fx.user(Role.ORGANIZER);
        Venue venue = fx.venue(organizer);
        Seat a1 = fx.seat(venue, "VIP", "A", "1");
        Event event = fx.draft(organizer, venue, SeatingMode.RESERVED_SEATING, now.plus(10, ChronoUnit.DAYS));
        fx.sectionType(event, "VIP", "2500.00", "VIP");
        fx.publish(event);
        User customer = fx.user(Role.CUSTOMER);
        long bookingId = createSeatBooking(customer, event, a1);
        post(customer, "/api/bookings/" + bookingId + "/demo-payment").andExpect(status().isOk());

        post(customer, "/api/bookings/" + bookingId + "/cancel")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELLED"))
                .andExpect(jsonPath("$.payment.status").value("REFUNDED"));

        em.clear();
        mockMvc.perform(get("/api/events/{id}/seats", event.getId()))
                .andExpect(jsonPath("$.sections[0].seats[0].status").value("AVAILABLE"));
        tryBookSeat(fx.user(Role.CUSTOMER), event, a1).andExpect(status().isCreated()); // someone else can book it
    }

    @Test
    void paidBookingsCannotBeCancelledInsideTheCutoffWindowButUnpaidOnesCan() throws Exception {
        User organizer = fx.user(Role.ORGANIZER);
        TicketTypeHolder h = new TicketTypeHolder();
        // Starts in 10 hours; the default cancellation cutoff is 24 hours before the start.
        Event event = publishedGaEvent(organizer, now.plus(10, ChronoUnit.HOURS), h);
        User customer = fx.user(Role.CUSTOMER);

        long paidId = createGaBooking(customer, event, h.type, 1);
        post(customer, "/api/bookings/" + paidId + "/demo-payment").andExpect(status().isOk());
        post(customer, "/api/bookings/" + paidId + "/cancel")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail", containsString("24 hours")));
        assertThat(bookings.findById(paidId).orElseThrow().getStatus()).isEqualTo(BookingStatus.CONFIRMED);

        long unpaidId = createGaBooking(customer, event, h.type, 1);
        post(customer, "/api/bookings/" + unpaidId + "/cancel").andExpect(status().isOk());
    }

    @Test
    void nobodyCanCancelAnotherCustomersBooking() throws Exception {
        User organizer = fx.user(Role.ORGANIZER);
        TicketTypeHolder h = new TicketTypeHolder();
        Event event = publishedGaEvent(organizer, now.plus(10, ChronoUnit.DAYS), h);
        long bookingId = createGaBooking(fx.user(Role.CUSTOMER), event, h.type, 1);

        post(fx.user(Role.CUSTOMER), "/api/bookings/" + bookingId + "/cancel").andExpect(status().isNotFound());

        assertThat(bookings.findById(bookingId).orElseThrow().getStatus()).isEqualTo(BookingStatus.PENDING_PAYMENT);
    }

    // ---------- viewing ----------

    @Test
    void myBookingsAreSplitIntoBucketsAndOnlyShowTheCustomersOwn() throws Exception {
        User organizer = fx.user(Role.ORGANIZER);
        TicketTypeHolder h = new TicketTypeHolder();
        Event event = publishedGaEvent(organizer, now.plus(10, ChronoUnit.DAYS), h);
        User ana = fx.user(Role.CUSTOMER);
        User ben = fx.user(Role.CUSTOMER);

        long paid = createGaBooking(ana, event, h.type, 1);
        post(ana, "/api/bookings/" + paid + "/demo-payment").andExpect(status().isOk());
        createGaBooking(ana, event, h.type, 1);                    // still pending
        long cancelled = createGaBooking(ana, event, h.type, 1);
        post(ana, "/api/bookings/" + cancelled + "/cancel").andExpect(status().isOk());

        // A paid booking for an event that has already ended.
        Event ended = fx.draft(organizer, fx.venue(organizer), SeatingMode.GENERAL_ADMISSION,
                now.minus(5, ChronoUnit.DAYS));
        TicketType endedType = fx.gaType(ended, "Standing", "100.00", 10, 4);
        fx.publish(ended);
        Booking old = new Booking(ana, ended, BookingReference.generate(), now.minus(5, ChronoUnit.DAYS));
        old.addItem(endedType, 1);
        old.confirm(now.minus(6, ChronoUnit.DAYS));
        bookings.saveAndFlush(old);

        createGaBooking(ben, event, h.type, 1);

        getAs(ana, "/api/bookings/my").andExpect(jsonPath("$.totalElements").value(4));
        getAs(ana, "/api/bookings/my?bucket=upcoming").andExpect(jsonPath("$.totalElements").value(2));
        getAs(ana, "/api/bookings/my?bucket=past").andExpect(jsonPath("$.totalElements").value(1));
        getAs(ana, "/api/bookings/my?bucket=cancelled").andExpect(jsonPath("$.totalElements").value(1));
        getAs(ben, "/api/bookings/my").andExpect(jsonPath("$.totalElements").value(1));
        getAs(ana, "/api/bookings/my?size=2&page=1")
                .andExpect(jsonPath("$.content.length()").value(2))
                .andExpect(jsonPath("$.totalPages").value(2));
        getAs(ana, "/api/bookings/my?bucket=bogus").andExpect(status().isBadRequest());
    }

    @Test
    void anUnpaidHoldThatRanOutShowsAsExpiredEvenBeforeTheSweeperRuns() throws Exception {
        User organizer = fx.user(Role.ORGANIZER);
        TicketTypeHolder h = new TicketTypeHolder();
        Event event = publishedGaEvent(organizer, now.plus(10, ChronoUnit.DAYS), h);
        User customer = fx.user(Role.CUSTOMER);
        long bookingId = createGaBooking(customer, event, h.type, 1);
        em.flush();
        jdbc.update("UPDATE bookings SET expires_at = now() - interval '5 minutes' WHERE id = ?", bookingId);
        em.clear();

        getAs(customer, "/api/bookings/my")
                .andExpect(jsonPath("$.content[0].status").value("EXPIRED"));
        getAs(customer, "/api/bookings/my?bucket=upcoming").andExpect(jsonPath("$.totalElements").value(0));
        getAs(customer, "/api/bookings/my?bucket=cancelled").andExpect(jsonPath("$.totalElements").value(1));
    }

    @Test
    void bookingDetailShowsLinesAndIsOnlyVisibleToItsOwner() throws Exception {
        User organizer = fx.user(Role.ORGANIZER);
        TicketTypeHolder h = new TicketTypeHolder();
        Event event = publishedGaEvent(organizer, now.plus(10, ChronoUnit.DAYS), h);
        User owner = fx.user(Role.CUSTOMER);
        long bookingId = createGaBooking(owner, event, h.type, 2);

        getAs(owner, "/api/bookings/" + bookingId)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].quantity").value(2))
                .andExpect(jsonPath("$.eventTitle").value("Concert"))
                .andExpect(jsonPath("$.payment").doesNotExist());

        getAs(fx.user(Role.CUSTOMER), "/api/bookings/" + bookingId).andExpect(status().isNotFound());
        getAs(owner, "/api/bookings/999999999").andExpect(status().isNotFound());
        mockMvc.perform(get("/api/bookings/" + bookingId)).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/bookings/my")).andExpect(status().isUnauthorized());
    }

    // ---------- database safety net ----------

    @Test
    void databaseRefusesASecondSuccessfulPaymentForOneBooking() throws Exception {
        User organizer = fx.user(Role.ORGANIZER);
        TicketTypeHolder h = new TicketTypeHolder();
        Event event = publishedGaEvent(organizer, now.plus(10, ChronoUnit.DAYS), h);
        User customer = fx.user(Role.CUSTOMER);
        Booking booking = new Booking(customer, event, BookingReference.generate(), now.plus(15, ChronoUnit.MINUTES));
        booking.addItem(h.type, 1);
        bookings.saveAndFlush(booking);
        payments.saveAndFlush(Payment.demoSuccess(booking));

        assertThatThrownBy(() -> payments.saveAndFlush(Payment.demoSuccess(booking)))
                .isInstanceOf(DataIntegrityViolationException.class);
    }
}