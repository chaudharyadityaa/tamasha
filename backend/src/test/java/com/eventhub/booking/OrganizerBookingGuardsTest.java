package com.eventhub.booking;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.eventhub.TestcontainersConfiguration;
import com.eventhub.event.Event;
import com.eventhub.event.SeatingMode;
import com.eventhub.event.TicketType;
import com.eventhub.event.TicketTypeRepository;
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
import java.util.UUID;
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
class OrganizerBookingGuardsTest {

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
    private BookingSeatRepository bookingSeats;
    @Autowired
    private PaymentRepository payments;
    @Autowired
    private TicketTypeRepository ticketTypes;
    @Autowired
    private EntityManager em;

    // ---------- helpers (named so they do not clash with the static-imported post/get/delete) ----------

    private ResultActions postAs(User user, String url) throws Exception {
        return mockMvc.perform(post(url).header("Authorization", fx.bearer(user)));
    }

    private ResultActions getAs(User user, String url) throws Exception {
        return mockMvc.perform(get(url).header("Authorization", fx.bearer(user)));
    }

    private ResultActions deleteAs(User user, String url) throws Exception {
        return mockMvc.perform(delete(url).header("Authorization", fx.bearer(user)));
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

    private long bookSeat(User user, Event event, Seat seat) throws Exception {
        String json = """
                {"eventId":%d,"seatIds":[%d]}
                """.formatted(event.getId(), seat.getId());
        String body = mockMvc.perform(post("/api/bookings").header("Authorization", fx.bearer(user))
                        .contentType(MediaType.APPLICATION_JSON).content(json))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return ((Number) JsonPath.read(body, "$.id")).longValue();
    }

    private void pay(User user, long bookingId) throws Exception {
        postAs(user, "/api/bookings/" + bookingId + "/demo-payment").andExpect(status().isOk());
    }

    private User namedCustomer(String fullName) {
        String email = fullName.toLowerCase().replace(' ', '.') + "-" + UUID.randomUUID() + "@example.com";
        return users.saveAndFlush(new User(email, "hash", fullName, Role.CUSTOMER));
    }

    private Booking reload(long bookingId) {
        return bookings.findById(bookingId).orElseThrow();
    }

    // ---------- guards ----------

    @Test
    void anEventWithActiveBookingsCannotBeUnpublishedButLapsedHoldsDoNotBlock() throws Exception {
        User organizer = fx.user(Role.ORGANIZER);
        Venue venue = fx.venue(organizer);
        Event event = fx.draft(organizer, venue, SeatingMode.GENERAL_ADMISSION, now.plus(10, ChronoUnit.DAYS));
        TicketType type = fx.gaType(event, "Standing", "100.00", 100, 4);
        fx.publish(event);
        User ana = fx.user(Role.CUSTOMER);
        long bookingId = bookGa(ana, event, type, 1);

        postAs(organizer, "/api/organizer/events/" + event.getId() + "/unpublish")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail", containsString("active bookings")));

        postAs(ana, "/api/bookings/" + bookingId + "/cancel").andExpect(status().isOk());
        postAs(organizer, "/api/organizer/events/" + event.getId() + "/unpublish")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("DRAFT"));

        // A hold that already ran out does not count as active.
        Event other = fx.draft(organizer, venue, SeatingMode.GENERAL_ADMISSION, now.plus(11, ChronoUnit.DAYS));
        TicketType otherType = fx.gaType(other, "Standing", "100.00", 100, 4);
        fx.publish(other);
        Booking lapsed = new Booking(ana, other, BookingReference.generate(), now.minus(1, ChronoUnit.MINUTES));
        lapsed.addItem(otherType, 1);
        bookings.saveAndFlush(lapsed);
        postAs(organizer, "/api/organizer/events/" + other.getId() + "/unpublish").andExpect(status().isOk());
    }

    @Test
    void cancellingAnEventCancelsGeneralAdmissionBookingsRefundsPaymentsAndReleasesTickets() throws Exception {
        User organizer = fx.user(Role.ORGANIZER);
        Event event = fx.draft(organizer, fx.venue(organizer), SeatingMode.GENERAL_ADMISSION,
                now.plus(10, ChronoUnit.DAYS));
        TicketType type = fx.gaType(event, "Standing", "100.00", 100, 4);
        fx.publish(event);
        User ana = fx.user(Role.CUSTOMER);
        User ben = fx.user(Role.CUSTOMER);
        long unpaid = bookGa(ana, event, type, 2);
        long paid = bookGa(ben, event, type, 1);
        pay(ben, paid);

        postAs(organizer, "/api/organizer/events/" + event.getId() + "/cancel")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELLED"));

        em.flush();
        em.clear();
        assertThat(reload(unpaid).getStatus()).isEqualTo(BookingStatus.CANCELLED);
        assertThat(reload(paid).getStatus()).isEqualTo(BookingStatus.CANCELLED);
        assertThat(payments.findByBookingId(paid)).extracting(Payment::getStatus)
                .containsExactly(PaymentStatus.REFUNDED);
        assertThat(ticketTypes.findById(type.getId()).orElseThrow().getQuantitySold()).isZero();

        mockMvc.perform(get("/api/events/{id}", event.getId())).andExpect(status().isNotFound());
        String newBooking = """
                {"eventId":%d,"items":[{"ticketTypeId":%d,"quantity":1}]}
                """.formatted(event.getId(), type.getId());
        mockMvc.perform(post("/api/bookings").header("Authorization", fx.bearer(ana))
                        .contentType(MediaType.APPLICATION_JSON).content(newBooking))
                .andExpect(status().isNotFound());
        postAs(ana, "/api/bookings/" + unpaid + "/demo-payment").andExpect(status().isConflict());
    }

    @Test
    void cancellingAReservedSeatingEventReleasesEverySeat() throws Exception {
        User organizer = fx.user(Role.ORGANIZER);
        Venue venue = fx.venue(organizer);
        Seat a1 = fx.seat(venue, "VIP", "A", "1");
        Seat a2 = fx.seat(venue, "VIP", "A", "2");
        Event event = fx.draft(organizer, venue, SeatingMode.RESERVED_SEATING, now.plus(10, ChronoUnit.DAYS));
        fx.sectionType(event, "VIP", "2500.00", "VIP");
        fx.publish(event);
        User ana = fx.user(Role.CUSTOMER);
        User ben = fx.user(Role.CUSTOMER);
        long unpaid = bookSeat(ana, event, a1);
        long paid = bookSeat(ben, event, a2);
        pay(ben, paid);
        assertThat(bookingSeats.countByEventIdAndReleasedAtIsNull(event.getId())).isEqualTo(2);

        postAs(organizer, "/api/organizer/events/" + event.getId() + "/cancel").andExpect(status().isOk());

        em.flush();
        em.clear();
        assertThat(bookingSeats.countByEventIdAndReleasedAtIsNull(event.getId())).isZero();
        assertThat(reload(unpaid).getStatus()).isEqualTo(BookingStatus.CANCELLED);
        assertThat(reload(paid).getStatus()).isEqualTo(BookingStatus.CANCELLED);
    }

    @Test
    void anOrganizersCancellationIgnoresTheCustomersCutoffWindow() throws Exception {
        User organizer = fx.user(Role.ORGANIZER);
        // Starts in 5 hours: inside the default 24-hour customer cutoff.
        Event event = fx.draft(organizer, fx.venue(organizer), SeatingMode.GENERAL_ADMISSION,
                now.plus(5, ChronoUnit.HOURS));
        TicketType type = fx.gaType(event, "Standing", "100.00", 100, 4);
        fx.publish(event);
        User ana = fx.user(Role.CUSTOMER);
        long bookingId = bookGa(ana, event, type, 1);
        pay(ana, bookingId);

        postAs(ana, "/api/bookings/" + bookingId + "/cancel").andExpect(status().isConflict()); // customer: too late
        postAs(organizer, "/api/organizer/events/" + event.getId() + "/cancel").andExpect(status().isOk());

        em.flush();
        em.clear();
        assertThat(reload(bookingId).getStatus()).isEqualTo(BookingStatus.CANCELLED);
        assertThat(payments.findByBookingId(bookingId)).extracting(Payment::getStatus)
                .containsExactly(PaymentStatus.REFUNDED);
    }

    @Test
    void aTicketTypeUsedByAnyBookingCannotBeDeletedButAnUnusedOneCan() throws Exception {
        User organizer = fx.user(Role.ORGANIZER);
        Venue venue = fx.venue(organizer);
        Event event = fx.draft(organizer, venue, SeatingMode.GENERAL_ADMISSION, now.plus(10, ChronoUnit.DAYS));
        TicketType used = fx.gaType(event, "Standing", "100.00", 100, 4);
        fx.publish(event);
        User ana = fx.user(Role.CUSTOMER);
        long bookingId = bookGa(ana, event, used, 1);
        postAs(ana, "/api/bookings/" + bookingId + "/cancel").andExpect(status().isOk());
        postAs(organizer, "/api/organizer/events/" + event.getId() + "/unpublish").andExpect(status().isOk());

        deleteAs(organizer, "/api/organizer/events/" + event.getId() + "/ticket-types/" + used.getId())
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail", containsString("bookings")));
        assertThat(ticketTypes.findById(used.getId())).isPresent();

        Event fresh = fx.draft(organizer, venue, SeatingMode.GENERAL_ADMISSION, now.plus(12, ChronoUnit.DAYS));
        TicketType unused = fx.gaType(fresh, "Standing", "100.00", 100, 4);
        deleteAs(organizer, "/api/organizer/events/" + fresh.getId() + "/ticket-types/" + unused.getId())
                .andExpect(status().isNoContent());
    }

    // ---------- organizer views ----------

    @Test
    void organizerListsTheBookingsOfTheirOwnEventWithNamesButNoEmails() throws Exception {
        User organizer = fx.user(Role.ORGANIZER);
        User otherOrganizer = fx.user(Role.ORGANIZER);
        Event event = fx.draft(organizer, fx.venue(organizer), SeatingMode.GENERAL_ADMISSION,
                now.plus(10, ChronoUnit.DAYS));
        TicketType type = fx.gaType(event, "Standing", "100.00", 100, 4);
        fx.publish(event);
        bookGa(namedCustomer("Ana Verma"), event, type, 1);
        bookGa(namedCustomer("Ben Roy"), event, type, 2);
        String url = "/api/organizer/events/" + event.getId() + "/bookings";

        getAs(organizer, url)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(2))
                .andExpect(jsonPath("$.content[*].customerName", containsInAnyOrder("Ana Verma", "Ben Roy")))
                .andExpect(jsonPath("$.content[0].reference").isNotEmpty())
                .andExpect(jsonPath("$.content[0].customerEmail").doesNotExist())
                .andExpect(jsonPath("$.content[0].email").doesNotExist());

        getAs(otherOrganizer, url).andExpect(status().isNotFound());
        getAs(fx.user(Role.CUSTOMER), url).andExpect(status().isForbidden());
        getAs(organizer, url + "?size=1&page=1").andExpect(jsonPath("$.content.length()").value(1));
    }

    @Test
    void statsShowTicketsRevenueAndOccupancyForGeneralAdmission() throws Exception {
        User organizer = fx.user(Role.ORGANIZER);
        Event event = fx.draft(organizer, fx.venue(organizer), SeatingMode.GENERAL_ADMISSION,
                now.plus(10, ChronoUnit.DAYS));
        TicketType type = fx.gaType(event, "Standing", "100.00", 100, 4);
        fx.publish(event);
        User ana = fx.user(Role.CUSTOMER);
        User ben = fx.user(Role.CUSTOMER);
        User cara = fx.user(Role.CUSTOMER);
        long confirmed = bookGa(ana, event, type, 3);
        pay(ana, confirmed);
        bookGa(ben, event, type, 2);                       // still held
        long cancelled = bookGa(cara, event, type, 1);
        postAs(cara, "/api/bookings/" + cancelled + "/cancel").andExpect(status().isOk());
        em.flush();

        getAs(organizer, "/api/organizer/events/" + event.getId() + "/stats")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.confirmedRevenue").value(300.0))
                .andExpect(jsonPath("$.bookingsByStatus.CONFIRMED").value(1))
                .andExpect(jsonPath("$.bookingsByStatus.PENDING_PAYMENT").value(1))
                .andExpect(jsonPath("$.bookingsByStatus.CANCELLED").value(1))
                .andExpect(jsonPath("$.bookingsByStatus.EXPIRED").value(0))
                .andExpect(jsonPath("$.ticketTypes[0].capacity").value(100))
                .andExpect(jsonPath("$.ticketTypes[0].confirmed").value(3))
                .andExpect(jsonPath("$.ticketTypes[0].held").value(2))
                .andExpect(jsonPath("$.ticketTypes[0].available").value(95))
                .andExpect(jsonPath("$.overall.occupancyPercent").value(5.0));

        getAs(fx.user(Role.ORGANIZER), "/api/organizer/events/" + event.getId() + "/stats")
                .andExpect(status().isNotFound()); // not their event
    }

    @Test
    void statsCountSeatsForReservedSeating() throws Exception {
        User organizer = fx.user(Role.ORGANIZER);
        Venue venue = fx.venue(organizer);
        Seat a1 = fx.seat(venue, "VIP", "A", "1");
        Seat a2 = fx.seat(venue, "VIP", "A", "2");
        fx.seat(venue, "VIP", "A", "3");
        fx.seat(venue, "VIP", "A", "4");
        Event event = fx.draft(organizer, venue, SeatingMode.RESERVED_SEATING, now.plus(10, ChronoUnit.DAYS));
        fx.sectionType(event, "VIP", "250.00", "VIP");
        fx.publish(event);
        User ana = fx.user(Role.CUSTOMER);
        long paid = bookSeat(ana, event, a1);
        pay(ana, paid);
        bookSeat(fx.user(Role.CUSTOMER), event, a2);       // held, unpaid
        em.flush();

        getAs(organizer, "/api/organizer/events/" + event.getId() + "/stats")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.confirmedRevenue").value(250.0))
                .andExpect(jsonPath("$.ticketTypes[0].seatSection").value("VIP"))
                .andExpect(jsonPath("$.ticketTypes[0].capacity").value(4))
                .andExpect(jsonPath("$.ticketTypes[0].confirmed").value(1))
                .andExpect(jsonPath("$.ticketTypes[0].held").value(1))
                .andExpect(jsonPath("$.ticketTypes[0].available").value(2))
                .andExpect(jsonPath("$.overall.occupancyPercent").value(50.0));
    }
}