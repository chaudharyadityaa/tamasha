package com.eventhub.booking;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.eventhub.TestcontainersConfiguration;
import com.eventhub.event.Event;
import com.eventhub.event.SeatingMode;
import com.eventhub.event.TicketType;
import com.eventhub.testsupport.TestFixtures;
import com.eventhub.user.Role;
import com.eventhub.user.User;
import com.eventhub.venue.Seat;
import com.eventhub.venue.Venue;
import com.jayway.jsonpath.JsonPath;
import jakarta.persistence.EntityManager;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;
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
class TicketFlowTest {

    private final Instant now = Instant.now();

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private TestFixtures fx;
    @Autowired
    private BookingRepository bookings;
    @Autowired
    private TicketRepository tickets;
    @Autowired
    private TicketIssuer ticketIssuer;
    @Autowired
    private EntityManager em;

    // ---------- helpers (named so they do not clash with the static-imported post/get) ----------

    private ResultActions postAs(User user, String url) throws Exception {
        return mockMvc.perform(post(url).header("Authorization", fx.bearer(user)));
    }

    private ResultActions getAs(User user, String url) throws Exception {
        return mockMvc.perform(get(url).header("Authorization", fx.bearer(user)));
    }

    private long createBooking(User user, String json) throws Exception {
        String body = mockMvc.perform(post("/api/bookings").header("Authorization", fx.bearer(user))
                        .contentType(MediaType.APPLICATION_JSON).content(json))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return ((Number) JsonPath.read(body, "$.id")).longValue();
    }

    private long bookGa(User user, Event event, TicketType type, int quantity) throws Exception {
        return createBooking(user, """
                {"eventId":%d,"items":[{"ticketTypeId":%d,"quantity":%d}]}
                """.formatted(event.getId(), type.getId(), quantity));
    }

    private long bookSeats(User user, Event event, Seat... seats) throws Exception {
        String ids = Arrays.stream(seats).map(seat -> String.valueOf(seat.getId()))
                .collect(Collectors.joining(","));
        return createBooking(user, """
                {"eventId":%d,"seatIds":[%s]}
                """.formatted(event.getId(), ids));
    }

    private void pay(User user, long bookingId) throws Exception {
        postAs(user, "/api/bookings/" + bookingId + "/demo-payment").andExpect(status().isOk());
    }

    private String ticketsJson(User user, long bookingId) throws Exception {
        return getAs(user, "/api/bookings/" + bookingId + "/tickets")
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
    }

    private Event gaEvent(User organizer, Venue venue, TicketType[] typeOut) {
        Event event = fx.draft(organizer, venue, SeatingMode.GENERAL_ADMISSION, now.plus(10, ChronoUnit.DAYS));
        typeOut[0] = fx.gaType(event, "Standing", "100.00", 100, 4);
        return fx.publish(event);
    }

    // ---------- tests ----------

    @Test
    void paymentIssuesOneTicketPerTicketBoughtAndOnePerSeat() throws Exception {
        User organizer = fx.user(Role.ORGANIZER);
        Venue venue = fx.venue(organizer);
        TicketType[] standing = new TicketType[1];
        Event ga = gaEvent(organizer, venue, standing);
        Seat a1 = fx.seat(venue, "VIP", "A", "1");
        Seat a2 = fx.seat(venue, "VIP", "A", "2");
        Event reserved = fx.draft(organizer, venue, SeatingMode.RESERVED_SEATING, now.plus(11, ChronoUnit.DAYS));
        fx.sectionType(reserved, "VIP", "2500.00", "VIP");
        fx.publish(reserved);
        User ana = fx.user(Role.CUSTOMER);
        User ben = fx.user(Role.CUSTOMER);

        long gaBooking = bookGa(ana, ga, standing[0], 3);
        getAs(ana, "/api/bookings/" + gaBooking + "/tickets").andExpect(jsonPath("$.length()").value(0)); // unpaid
        pay(ana, gaBooking);
        List<String> codes = JsonPath.read(ticketsJson(ana, gaBooking), "$[*].code");
        assertThat(codes).hasSize(3).doesNotHaveDuplicates()
                .allMatch(code -> code.matches("^TK-[0-9A-HJKMNP-TV-Z]{20}$"));
        getAs(ana, "/api/bookings/" + gaBooking + "/tickets")
                .andExpect(jsonPath("$[0].status").value("VALID"))
                .andExpect(jsonPath("$[0].seat").doesNotExist());

        long seatBooking = bookSeats(ben, reserved, a1, a2);
        pay(ben, seatBooking);
        getAs(ben, "/api/bookings/" + seatBooking + "/tickets")
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].seat.section").value("VIP"))
                .andExpect(jsonPath("$[0].seat.row").value("A"));
    }

    @Test
    void ticketDetailHasEverythingForAPrintableTicket() throws Exception {
        User organizer = fx.user(Role.ORGANIZER);
        Venue venue = fx.venue(organizer);
        Seat a1 = fx.seat(venue, "VIP", "A", "1");
        Event event = fx.draft(organizer, venue, SeatingMode.RESERVED_SEATING, now.plus(10, ChronoUnit.DAYS));
        fx.sectionType(event, "VIP", "2500.00", "VIP");
        fx.publish(event);
        User ana = fx.user(Role.CUSTOMER);
        long bookingId = bookSeats(ana, event, a1);
        pay(ana, bookingId);
        Number ticketId = JsonPath.read(ticketsJson(ana, bookingId), "$[0].id");

        getAs(ana, "/api/tickets/" + ticketId.longValue())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("VALID"))
                .andExpect(jsonPath("$.qrAvailable").value(true))
                .andExpect(jsonPath("$.bookingReference").value(bookings.findById(bookingId).orElseThrow().getReference()))
                .andExpect(jsonPath("$.eventTitle").value("Concert"))
                .andExpect(jsonPath("$.venue.name").value("City Hall"))
                .andExpect(jsonPath("$.venue.timeZone").value("Asia/Kolkata"))
                .andExpect(jsonPath("$.ticketTypeName").value("VIP"))
                .andExpect(jsonPath("$.price").value(2500.0))
                .andExpect(jsonPath("$.currency").value("INR"))
                .andExpect(jsonPath("$.seat.number").value("1"));
    }

    @Test
    void qrCodesExistOnlyForValidTickets() throws Exception {
        User organizer = fx.user(Role.ORGANIZER);
        TicketType[] standing = new TicketType[1];
        Event event = gaEvent(organizer, fx.venue(organizer), standing);
        User ana = fx.user(Role.CUSTOMER);
        long bookingId = bookGa(ana, event, standing[0], 2);
        pay(ana, bookingId);
        List<Number> ids = JsonPath.read(ticketsJson(ana, bookingId), "$[*].id");
        List<Ticket> issued = tickets.findByBookingId(bookingId);

        byte[] png = getAs(ana, "/api/tickets/" + ids.get(0).longValue() + "/qr.png")
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.IMAGE_PNG))
                .andReturn().getResponse().getContentAsByteArray();
        assertThat(png).startsWith((byte) 0x89, (byte) 'P', (byte) 'N', (byte) 'G');

        // A ticket that was already used has no QR code any more.
        Ticket used = issued.get(1);
        tickets.checkIn(used.getCode(), event.getId(), organizer.getId(), now);
        getAs(ana, "/api/tickets/" + used.getId() + "/qr.png").andExpect(status().isConflict());
        getAs(ana, "/api/tickets/" + used.getId())
                .andExpect(jsonPath("$.status").value("CHECKED_IN"))
                .andExpect(jsonPath("$.qrAvailable").value(false));
    }

    @Test
    void onlyTheOwnerCanSeeTicketsAndQrCodes() throws Exception {
        User organizer = fx.user(Role.ORGANIZER);
        TicketType[] standing = new TicketType[1];
        Event event = gaEvent(organizer, fx.venue(organizer), standing);
        User owner = fx.user(Role.CUSTOMER);
        User stranger = fx.user(Role.CUSTOMER);
        long bookingId = bookGa(owner, event, standing[0], 1);
        pay(owner, bookingId);
        long ticketId = tickets.findByBookingId(bookingId).get(0).getId();

        getAs(stranger, "/api/bookings/" + bookingId + "/tickets").andExpect(status().isNotFound());
        getAs(stranger, "/api/tickets/" + ticketId).andExpect(status().isNotFound());
        getAs(stranger, "/api/tickets/" + ticketId + "/qr.png").andExpect(status().isNotFound());
        mockMvc.perform(get("/api/tickets/" + ticketId)).andExpect(status().isUnauthorized());
    }

    @Test
    void cancellingABookingVoidsItsTickets() throws Exception {
        User organizer = fx.user(Role.ORGANIZER);
        TicketType[] standing = new TicketType[1];
        Event event = gaEvent(organizer, fx.venue(organizer), standing);
        User ana = fx.user(Role.CUSTOMER);
        long bookingId = bookGa(ana, event, standing[0], 2);
        pay(ana, bookingId);

        postAs(ana, "/api/bookings/" + bookingId + "/cancel").andExpect(status().isOk());

        getAs(ana, "/api/bookings/" + bookingId + "/tickets")
                .andExpect(jsonPath("$[0].status").value("VOID"))
                .andExpect(jsonPath("$[0].qrAvailable").value(false))
                .andExpect(jsonPath("$[1].status").value("VOID"));
        long ticketId = tickets.findByBookingId(bookingId).get(0).getId();
        getAs(ana, "/api/tickets/" + ticketId + "/qr.png").andExpect(status().isConflict());
    }

    @Test
    void cancellingTheEventVoidsEveryTicket() throws Exception {
        User organizer = fx.user(Role.ORGANIZER);
        TicketType[] standing = new TicketType[1];
        Event event = gaEvent(organizer, fx.venue(organizer), standing);
        User ana = fx.user(Role.CUSTOMER);
        long bookingId = bookGa(ana, event, standing[0], 2);
        pay(ana, bookingId);

        postAs(organizer, "/api/organizer/events/" + event.getId() + "/cancel").andExpect(status().isOk());

        em.flush();
        em.clear();
        assertThat(tickets.findByBookingId(bookingId)).hasSize(2)
                .allMatch(ticket -> ticket.getStatus() == TicketStatus.VOID);
    }

    @Test
    void issuingTicketsTwiceDoesNotCreateDuplicates() throws Exception {
        User organizer = fx.user(Role.ORGANIZER);
        TicketType[] standing = new TicketType[1];
        Event event = gaEvent(organizer, fx.venue(organizer), standing);
        User ana = fx.user(Role.CUSTOMER);
        long bookingId = bookGa(ana, event, standing[0], 3);
        pay(ana, bookingId);
        Booking booking = bookings.findById(bookingId).orElseThrow();

        ticketIssuer.issue(booking);
        ticketIssuer.issue(booking);

        assertThat(tickets.findByBookingId(bookingId)).hasSize(3);
    }
}