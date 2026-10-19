package com.eventhub.admin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.eventhub.TestcontainersConfiguration;
import com.eventhub.booking.BookingRepository;
import com.eventhub.booking.BookingStatus;
import com.eventhub.booking.Payment;
import com.eventhub.booking.PaymentRepository;
import com.eventhub.booking.PaymentStatus;
import com.eventhub.booking.Ticket;
import com.eventhub.booking.TicketRepository;
import com.eventhub.booking.TicketStatus;
import com.eventhub.event.Event;
import com.eventhub.event.EventRepository;
import com.eventhub.event.EventStatus;
import com.eventhub.event.SeatingMode;
import com.eventhub.event.TicketType;
import com.eventhub.event.TicketTypeRepository;
import com.eventhub.testsupport.TestFixtures;
import com.eventhub.user.Role;
import com.eventhub.user.User;
import com.eventhub.user.UserRepository;
import com.eventhub.venue.Venue;
import com.jayway.jsonpath.JsonPath;
import jakarta.persistence.EntityManager;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@ActiveProfiles("test")
@Transactional
class AdminPlatformTest {

    private final Instant now = Instant.now();

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private TestFixtures fx;
    @Autowired
    private UserRepository users;
    @Autowired
    private EventRepository events;
    @Autowired
    private BookingRepository bookings;
    @Autowired
    private PaymentRepository payments;
    @Autowired
    private TicketRepository tickets;
    @Autowired
    private TicketTypeRepository ticketTypes;
    @Autowired
    private EntityManager em;

    // ---------- helpers (named so they do not clash with the static-imported get/post/put) ----------

    private ResultActions getAs(User user, String url) throws Exception {
        return mockMvc.perform(get(url).header("Authorization", fx.bearer(user)));
    }

    private ResultActions postAs(User user, String url) throws Exception {
        return mockMvc.perform(post(url).header("Authorization", fx.bearer(user)));
    }

    private ResultActions putAs(User user, String url, String json) throws Exception {
        return mockMvc.perform(put(url).header("Authorization", fx.bearer(user))
                .contentType(MediaType.APPLICATION_JSON).content(json));
    }

    private long bookGa(User user, Event event, TicketType type, int quantity) throws Exception {
        String json = """
                {"eventId":%d,"items":[{"ticketTypeId":%d,"quantity":%d}]}
                """.formatted(event.getId(), type.getId(), quantity);
        String body = mockMvc.perform(post("/api/bookings").header("Authorization", fx.bearer(user))
                        .contentType(MediaType.APPLICATION_JSON).content(json))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return ((Number) JsonPath.read(body, "$.id")).longValue();
    }

    private void pay(User user, long bookingId) throws Exception {
        postAs(user, "/api/bookings/" + bookingId + "/demo-payment").andExpect(status().isOk());
    }

    private Event publishedGaEvent(User organizer, Venue venue, Instant start, TicketType[] typeOut) {
        Event event = fx.draft(organizer, venue, SeatingMode.GENERAL_ADMISSION, start);
        typeOut[0] = fx.gaType(event, "Standing", "100.00", 100, 4);
        return fx.publish(event);
    }

    // ---------- dashboard ----------

    @Test
    void dashboardCountsUsersEventsBookingsTicketsAndRevenue() throws Exception {
        User admin = fx.user(Role.ADMIN);
        User organizer = fx.user(Role.ORGANIZER);
        User ana = fx.user(Role.CUSTOMER);
        User ben = fx.user(Role.CUSTOMER);
        Venue venue = fx.venue(organizer);
        TicketType[] standing = new TicketType[1];
        Event live = publishedGaEvent(organizer, venue, now.plus(10, ChronoUnit.DAYS), standing);
        fx.draft(organizer, venue, SeatingMode.GENERAL_ADMISSION, now.plus(11, ChronoUnit.DAYS)); // stays a draft
        long paid = bookGa(ana, live, standing[0], 2);
        pay(ana, paid);
        bookGa(ben, live, standing[0], 1); // held, unpaid
        em.flush();

        getAs(admin, "/api/admin/dashboard")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.users.total").value(4))
                .andExpect(jsonPath("$.users.byRole.CUSTOMER").value(2))
                .andExpect(jsonPath("$.users.byRole.ADMIN").value(1))
                .andExpect(jsonPath("$.users.disabled").value(0))
                .andExpect(jsonPath("$.events.total").value(2))
                .andExpect(jsonPath("$.events.byStatus.PUBLISHED").value(1))
                .andExpect(jsonPath("$.events.byStatus.DRAFT").value(1))
                .andExpect(jsonPath("$.events.upcomingPublished").value(1))
                .andExpect(jsonPath("$.bookings.total").value(2))
                .andExpect(jsonPath("$.bookings.byStatus.CONFIRMED").value(1))
                .andExpect(jsonPath("$.bookings.byStatus.PENDING_PAYMENT").value(1))
                .andExpect(jsonPath("$.tickets.total").value(2))
                .andExpect(jsonPath("$.tickets.valid").value(2))
                .andExpect(jsonPath("$.confirmedRevenue[0].currency").value("INR"))
                .andExpect(jsonPath("$.confirmedRevenue[0].amount").value(200.0))
                .andExpect(jsonPath("$.demoPaymentsEnabled").value(true));
    }

    @Test
    void onlyAnActiveAdminCanUseTheAdminApi() throws Exception {
        User admin = fx.user(Role.ADMIN);
        String staleAdminToken = fx.bearer(admin);

        mockMvc.perform(get("/api/admin/dashboard")).andExpect(status().isUnauthorized());
        getAs(fx.user(Role.CUSTOMER), "/api/admin/dashboard").andExpect(status().isForbidden());
        getAs(fx.user(Role.ORGANIZER), "/api/admin/dashboard").andExpect(status().isForbidden());
        getAs(fx.user(Role.ORGANIZER), "/api/admin/events").andExpect(status().isForbidden());
        getAs(fx.user(Role.CUSTOMER), "/api/admin/bookings").andExpect(status().isForbidden());

        admin.setRole(Role.CUSTOMER); // demoted after the token was issued
        users.saveAndFlush(admin);
        mockMvc.perform(get("/api/admin/dashboard").header("Authorization", staleAdminToken))
                .andExpect(status().isForbidden());
    }

    // ---------- users ----------

    @Test
    void adminSearchesAndFiltersUsers() throws Exception {
        User admin = fx.user(Role.ADMIN);
        User organizer = fx.user(Role.ORGANIZER);
        User ana = users.saveAndFlush(new User("ana.verma@example.com", "hash", "Ana Verma", Role.CUSTOMER));
        User off = users.saveAndFlush(new User("off.user@example.com", "hash", "Off User", Role.CUSTOMER));
        off.setEnabled(false);
        users.saveAndFlush(off);

        getAs(admin, "/api/admin/users?role=ORGANIZER")
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].id").value(organizer.getId().intValue()));
        getAs(admin, "/api/admin/users?q=ANA.VERMA")
                .andExpect(jsonPath("$.content[*].email", contains("ana.verma@example.com")));
        getAs(admin, "/api/admin/users?enabled=false")
                .andExpect(jsonPath("$.content[*].email", contains("off.user@example.com")))
                .andExpect(jsonPath("$.content[0].enabled").value(false));
        getAs(admin, "/api/admin/users?q=%")
                .andExpect(jsonPath("$.totalElements").value(0)); // a literal percent sign, not a wildcard
        assertThat(ana.getId()).isNotNull();
    }

    @Test
    void disablingAnAccountBlocksLoginAndExistingTokensAndEnablingRestoresIt() throws Exception {
        User admin = fx.user(Role.ADMIN);
        User customer = fx.user(Role.CUSTOMER);
        String oldToken = fx.bearer(customer);
        String url = "/api/admin/users/" + customer.getId() + "/enabled";
        String loginJson = "{\"email\":\"" + customer.getEmail() + "\",\"password\":\"Sup3rSecret!\"}";

        mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(loginJson))
                .andExpect(status().isOk());

        putAs(admin, url, "{\"enabled\":false}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.enabled").value(false));
        mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(loginJson))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/bookings/my").header("Authorization", oldToken))
                .andExpect(status().isForbidden());

        putAs(admin, url, "{\"enabled\":true}").andExpect(status().isOk());
        mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(loginJson))
                .andExpect(status().isOk());

        putAs(admin, "/api/admin/users/" + admin.getId() + "/enabled", "{\"enabled\":false}")
                .andExpect(status().isConflict()); // not your own account
        putAs(admin, "/api/admin/users/999999999/enabled", "{\"enabled\":false}")
                .andExpect(status().isNotFound());
        putAs(admin, url, "{}").andExpect(status().isBadRequest());
    }

    // ---------- events ----------

    @Test
    void adminListsEveryEventWithFilters() throws Exception {
        User admin = fx.user(Role.ADMIN);
        User orgA = fx.user(Role.ORGANIZER);
        User orgB = fx.user(Role.ORGANIZER);
        TicketType[] typeOut = new TicketType[1];
        publishedGaEvent(orgA, fx.venue(orgA), now.plus(10, ChronoUnit.DAYS), typeOut);
        fx.draft(orgB, fx.venue(orgB), SeatingMode.GENERAL_ADMISSION, now.plus(11, ChronoUnit.DAYS));

        getAs(admin, "/api/admin/events").andExpect(jsonPath("$.totalElements").value(2));
        getAs(admin, "/api/admin/events?status=DRAFT")
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].organizerId").value(orgB.getId().intValue()));
        getAs(admin, "/api/admin/events?organizerId=" + orgA.getId())
                .andExpect(jsonPath("$.content[0].status").value("PUBLISHED"))
                .andExpect(jsonPath("$.content[0].organizerName").value("Test"))
                .andExpect(jsonPath("$.content[0].city").value("Agra"));
        getAs(admin, "/api/admin/events?q=concert").andExpect(jsonPath("$.totalElements").value(2));
        getAs(admin, "/api/admin/events?q=nothing-like-this").andExpect(jsonPath("$.totalElements").value(0));
    }

    @Test
    void adminCancelsAnyEventAndEveryBookingTicketAndPaymentFollows() throws Exception {
        User admin = fx.user(Role.ADMIN);
        User organizer = fx.user(Role.ORGANIZER);
        TicketType[] standing = new TicketType[1];
        Event event = publishedGaEvent(organizer, fx.venue(organizer), now.plus(10, ChronoUnit.DAYS), standing);
        User ana = fx.user(Role.CUSTOMER);
        User ben = fx.user(Role.CUSTOMER);
        long paid = bookGa(ana, event, standing[0], 2);
        pay(ana, paid);
        long unpaid = bookGa(ben, event, standing[0], 1);

        postAs(organizer, "/api/admin/events/" + event.getId() + "/cancel").andExpect(status().isForbidden());
        postAs(admin, "/api/admin/events/" + event.getId() + "/cancel")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELLED"));
        postAs(admin, "/api/admin/events/" + event.getId() + "/cancel").andExpect(status().isConflict());
        postAs(admin, "/api/admin/events/999999999/cancel").andExpect(status().isNotFound());

        em.flush();
        em.clear();
        assertThat(events.findById(event.getId()).orElseThrow().getStatus()).isEqualTo(EventStatus.CANCELLED);
        assertThat(bookings.findById(paid).orElseThrow().getStatus()).isEqualTo(BookingStatus.CANCELLED);
        assertThat(bookings.findById(unpaid).orElseThrow().getStatus()).isEqualTo(BookingStatus.CANCELLED);
        assertThat(payments.findByBookingId(paid)).extracting(Payment::getStatus)
                .containsExactly(PaymentStatus.REFUNDED);
        assertThat(tickets.findByBookingId(paid)).hasSize(2)
                .allMatch(ticket -> ticket.getStatus() == TicketStatus.VOID);
        assertThat(ticketTypes.findById(standing[0].getId()).orElseThrow().getQuantitySold()).isZero();
    }

    // ---------- bookings ----------

    @Test
    void adminListsAndViewsAnyBooking() throws Exception {
        User admin = fx.user(Role.ADMIN);
        User organizer = fx.user(Role.ORGANIZER);
        TicketType[] standing = new TicketType[1];
        Event event = publishedGaEvent(organizer, fx.venue(organizer), now.plus(10, ChronoUnit.DAYS), standing);
        User ana = users.saveAndFlush(new User("ana.verma@example.com", "hash", "Ana Verma", Role.CUSTOMER));
        User ben = fx.user(Role.CUSTOMER);
        long anaBooking = bookGa(ana, event, standing[0], 2);
        pay(ana, anaBooking);
        bookGa(ben, event, standing[0], 1);
        String reference = bookings.findById(anaBooking).orElseThrow().getReference();

        getAs(admin, "/api/admin/bookings").andExpect(jsonPath("$.totalElements").value(2));
        getAs(admin, "/api/admin/bookings?status=CONFIRMED")
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].customerEmail").value("ana.verma@example.com"))
                .andExpect(jsonPath("$.content[0].eventTitle").value("Concert"));
        getAs(admin, "/api/admin/bookings?q=" + reference.toLowerCase())
                .andExpect(jsonPath("$.content[*].reference", contains(reference)));
        getAs(admin, "/api/admin/bookings?q=ANA.VERMA")
                .andExpect(jsonPath("$.totalElements").value(1));
        getAs(admin, "/api/admin/bookings?eventId=" + event.getId()).andExpect(jsonPath("$.totalElements").value(2));

        getAs(admin, "/api/admin/bookings/" + anaBooking)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reference").value(reference))
                .andExpect(jsonPath("$.items[0].quantity").value(2))
                .andExpect(jsonPath("$.payment.demo").value(true));
        getAs(admin, "/api/admin/bookings/999999999").andExpect(status().isNotFound());
    }

    @Test
    void adminCancelsASingleBookingEvenInsideTheCustomersCutoffWindow() throws Exception {
        User admin = fx.user(Role.ADMIN);
        User organizer = fx.user(Role.ORGANIZER);
        // Starts in 5 hours: inside the default 24-hour customer cutoff.
        TicketType[] standing = new TicketType[1];
        Event event = publishedGaEvent(organizer, fx.venue(organizer), now.plus(5, ChronoUnit.HOURS), standing);
        User ana = fx.user(Role.CUSTOMER);
        long bookingId = bookGa(ana, event, standing[0], 2);
        pay(ana, bookingId);

        postAs(ana, "/api/bookings/" + bookingId + "/cancel").andExpect(status().isConflict()); // customer: too late
        postAs(admin, "/api/admin/bookings/" + bookingId + "/cancel")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELLED"))
                .andExpect(jsonPath("$.payment.status").value("REFUNDED"));
        postAs(admin, "/api/admin/bookings/" + bookingId + "/cancel").andExpect(status().isOk()); // repeatable

        em.flush();
        em.clear();
        List<Ticket> issued = tickets.findByBookingId(bookingId);
        assertThat(issued).hasSize(2).allMatch(ticket -> ticket.getStatus() == TicketStatus.VOID);
        assertThat(ticketTypes.findById(standing[0].getId()).orElseThrow().getQuantitySold()).isZero();
        postAs(fx.user(Role.CUSTOMER), "/api/admin/bookings/" + bookingId + "/cancel")
                .andExpect(status().isForbidden());
    }
}