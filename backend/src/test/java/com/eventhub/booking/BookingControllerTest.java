package com.eventhub.booking;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.matchesPattern;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.eventhub.TestcontainersConfiguration;
import com.eventhub.event.Event;
import com.eventhub.event.EventRepository;
import com.eventhub.event.SeatingMode;
import com.eventhub.event.TicketType;
import com.eventhub.event.TicketTypeRepository;
import com.eventhub.security.JwtTokenService;
import com.eventhub.user.Role;
import com.eventhub.user.User;
import com.eventhub.user.UserRepository;
import com.eventhub.venue.Seat;
import com.eventhub.venue.SeatRepository;
import com.eventhub.venue.Venue;
import com.eventhub.venue.VenueRepository;
import com.jayway.jsonpath.JsonPath;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Arrays;
import java.util.Locale;
import java.util.UUID;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@ActiveProfiles("test")
@Transactional
class BookingControllerTest {

    private final Instant now = Instant.now();

    @Autowired
    private MockMvc mockMvc;
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
    private PasswordEncoder passwordEncoder;
    @Autowired
    private JwtTokenService tokenService;
    @Autowired
    private EntityManager em;

    // ---------- helpers ----------

    private User saveUser(Role role) {
        String email = role.name().toLowerCase(Locale.ROOT) + "-" + UUID.randomUUID() + "@example.com";
        return users.saveAndFlush(new User(email, passwordEncoder.encode("Sup3rSecret!"), "Test", role));
    }

    private String bearer(User user) {
        return "Bearer " + tokenService.issueFor(user).value();
    }

    private Venue saveVenue(User owner) {
        return venues.saveAndFlush(new Venue(owner, "City Hall", "1 Main Road", "Agra",
                null, "India", "Asia/Kolkata", 500));
    }

    private Seat saveSeat(Venue venue, String section, String row, String number) {
        return seats.saveAndFlush(new Seat(venue, section, row, number));
    }

    private Event draftEvent(User organizer, Venue venue, SeatingMode mode, Instant start) {
        return events.saveAndFlush(new Event(organizer, venue, "Concert", null, "MUSIC", null,
                start, start.plus(3, ChronoUnit.HOURS), mode, "INR"));
    }

    private TicketType addGa(Event event, String name, String price, int quantity, int maxPerBooking,
                             Instant salesStart) {
        return ticketTypes.saveAndFlush(TicketType.generalAdmission(event, name, new BigDecimal(price),
                quantity, maxPerBooking, salesStart, null));
    }

    private TicketType addSection(Event event, String name, String price, String section) {
        return ticketTypes.saveAndFlush(TicketType.reservedSection(event, name, new BigDecimal(price),
                section, 4, null, null));
    }

    private Event publish(Event event) {
        event.setStartingPrice(new BigDecimal("1.00"));
        event.publish();
        return events.saveAndFlush(event);
    }

    private String gaJson(long eventId, long ticketTypeId, int quantity) {
        return """
                {"eventId":%d,"items":[{"ticketTypeId":%d,"quantity":%d}]}
                """.formatted(eventId, ticketTypeId, quantity);
    }

    private String seatJson(long eventId, Seat... chosen) {
        String ids = Arrays.stream(chosen).map(seat -> String.valueOf(seat.getId()))
                .collect(Collectors.joining(","));
        return """
                {"eventId":%d,"seatIds":[%s]}
                """.formatted(eventId, ids);
    }

    private ResultActions book(User user, String json) throws Exception {
        return mockMvc.perform(post("/api/bookings").header("Authorization", bearer(user))
                .contentType(MediaType.APPLICATION_JSON).content(json));
    }

    private ResultActions bookWithKey(User user, String json, String key) throws Exception {
        return mockMvc.perform(post("/api/bookings").header("Authorization", bearer(user))
                .header("Idempotency-Key", key)
                .contentType(MediaType.APPLICATION_JSON).content(json));
    }

    // ---------- general admission ----------

    @Test
    void customerBooksGeneralAdmissionTicketsAndInventoryDrops() throws Exception {
        User organizer = saveUser(Role.ORGANIZER);
        Event event = draftEvent(organizer, saveVenue(organizer), SeatingMode.GENERAL_ADMISSION,
                now.plus(10, ChronoUnit.DAYS));
        TicketType standing = addGa(event, "Standing", "100.00", 100, 4, null);
        publish(event);
        User customer = saveUser(Role.CUSTOMER);

        book(customer, gaJson(event.getId(), standing.getId(), 2))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PENDING_PAYMENT"))
                .andExpect(jsonPath("$.reference", matchesPattern("^EH-[0-9A-HJKMNP-TV-Z]{10}$")))
                .andExpect(jsonPath("$.totalAmount").value(200.0))
                .andExpect(jsonPath("$.currency").value("INR"))
                .andExpect(jsonPath("$.items[0].ticketTypeName").value("Standing"))
                .andExpect(jsonPath("$.items[0].quantity").value(2))
                .andExpect(jsonPath("$.items[0].lineTotal").value(200.0));

        Booking saved = bookings.findAll().get(0);
        assertThat(saved.getExpiresAt()).isBetween(now.plus(14, ChronoUnit.MINUTES), now.plus(16, ChronoUnit.MINUTES));
        assertThat(saved.getUser().getId()).isEqualTo(customer.getId());

        em.clear(); // this test is one long transaction; forget cached objects to see the database state
        mockMvc.perform(get("/api/events/{id}", event.getId()))
                .andExpect(jsonPath("$.ticketTypes[0].quantityRemaining").value(98));
    }

    @Test
    void clientSuppliedPricesAreIgnored() throws Exception {
        User organizer = saveUser(Role.ORGANIZER);
        Event event = draftEvent(organizer, saveVenue(organizer), SeatingMode.GENERAL_ADMISSION,
                now.plus(10, ChronoUnit.DAYS));
        TicketType standing = addGa(event, "Standing", "100.00", 100, 4, null);
        publish(event);

        book(saveUser(Role.CUSTOMER), """
                {"eventId":%d,"items":[{"ticketTypeId":%d,"quantity":3,"price":1,"unitPrice":1}],
                 "totalAmount":0,"status":"CONFIRMED","userId":1}
                """.formatted(event.getId(), standing.getId()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.totalAmount").value(300.0))
                .andExpect(jsonPath("$.status").value("PENDING_PAYMENT"));
    }

    @Test
    void ticketsRunOutAndFurtherBookingsAreRefused() throws Exception {
        User organizer = saveUser(Role.ORGANIZER);
        Event event = draftEvent(organizer, saveVenue(organizer), SeatingMode.GENERAL_ADMISSION,
                now.plus(10, ChronoUnit.DAYS));
        TicketType standing = addGa(event, "Standing", "100.00", 5, 4, null);
        publish(event);

        book(saveUser(Role.CUSTOMER), gaJson(event.getId(), standing.getId(), 4)).andExpect(status().isCreated());
        book(saveUser(Role.CUSTOMER), gaJson(event.getId(), standing.getId(), 2)).andExpect(status().isConflict());
        book(saveUser(Role.CUSTOMER), gaJson(event.getId(), standing.getId(), 1)).andExpect(status().isCreated());
        book(saveUser(Role.CUSTOMER), gaJson(event.getId(), standing.getId(), 1)).andExpect(status().isConflict());
    }

    @Test
    void perBookingLimitsAndDuplicateLinesAreRejected() throws Exception {
        User organizer = saveUser(Role.ORGANIZER);
        Event event = draftEvent(organizer, saveVenue(organizer), SeatingMode.GENERAL_ADMISSION,
                now.plus(10, ChronoUnit.DAYS));
        TicketType standing = addGa(event, "Standing", "100.00", 100, 4, null);
        publish(event);
        User customer = saveUser(Role.CUSTOMER);

        book(customer, gaJson(event.getId(), standing.getId(), 5)).andExpect(status().isBadRequest());
        book(customer, """
                {"eventId":%d,"items":[{"ticketTypeId":%d,"quantity":1},{"ticketTypeId":%d,"quantity":1}]}
                """.formatted(event.getId(), standing.getId(), standing.getId()))
                .andExpect(status().isBadRequest());
    }

    @Test
    void aTicketTypeOfAnotherEventIsRejected() throws Exception {
        User organizer = saveUser(Role.ORGANIZER);
        Venue venue = saveVenue(organizer);
        Event eventA = draftEvent(organizer, venue, SeatingMode.GENERAL_ADMISSION, now.plus(10, ChronoUnit.DAYS));
        Event eventB = draftEvent(organizer, venue, SeatingMode.GENERAL_ADMISSION, now.plus(11, ChronoUnit.DAYS));
        addGa(eventA, "Standing", "100.00", 100, 4, null);
        TicketType ofB = addGa(eventB, "Standing", "100.00", 100, 4, null);
        publish(eventA);
        publish(eventB);

        book(saveUser(Role.CUSTOMER), gaJson(eventA.getId(), ofB.getId(), 1)).andExpect(status().isBadRequest());
    }

    @Test
    void salesThatHaveNotOpenedOrEventsThatStartedAreRefused() throws Exception {
        User organizer = saveUser(Role.ORGANIZER);
        Venue venue = saveVenue(organizer);
        Event future = draftEvent(organizer, venue, SeatingMode.GENERAL_ADMISSION, now.plus(10, ChronoUnit.DAYS));
        TicketType notYetOnSale = addGa(future, "Early", "100.00", 10, 4, now.plus(2, ChronoUnit.DAYS));
        publish(future);
        Event started = draftEvent(organizer, venue, SeatingMode.GENERAL_ADMISSION, now.minus(1, ChronoUnit.HOURS));
        TicketType late = addGa(started, "Late", "100.00", 10, 4, null);
        publish(started);
        User customer = saveUser(Role.CUSTOMER);

        book(customer, gaJson(future.getId(), notYetOnSale.getId(), 1)).andExpect(status().isConflict());
        book(customer, gaJson(started.getId(), late.getId(), 1)).andExpect(status().isConflict());
    }

    // ---------- reserved seating ----------

    @Test
    void customerBooksReservedSeatsAndTheSeatMapShowsThemHeld() throws Exception {
        User organizer = saveUser(Role.ORGANIZER);
        Venue venue = saveVenue(organizer);
        Seat a1 = saveSeat(venue, "VIP", "A", "1");
        Seat a2 = saveSeat(venue, "VIP", "A", "2");
        saveSeat(venue, "Balcony", "B", "1");
        Event event = draftEvent(organizer, venue, SeatingMode.RESERVED_SEATING, now.plus(10, ChronoUnit.DAYS));
        addSection(event, "VIP", "2500.00", "VIP");
        addSection(event, "Balcony", "800.00", "Balcony");
        publish(event);

        book(saveUser(Role.CUSTOMER), seatJson(event.getId(), a1, a2))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.totalAmount").value(5000.0))
                .andExpect(jsonPath("$.seats.length()").value(2))
                .andExpect(jsonPath("$.seats[0].section").value("VIP"))
                .andExpect(jsonPath("$.seats[0].unitPrice").value(2500.0));

        em.clear();
        mockMvc.perform(get("/api/events/{id}/seats", event.getId()))
                .andExpect(jsonPath("$.sections[0].seats[0].status").value("HELD"))
                .andExpect(jsonPath("$.sections[0].seats[1].status").value("HELD"))
                .andExpect(jsonPath("$.sections[1].seats[0].status").value("AVAILABLE"));
    }

    @Test
    void aSeatHeldByAnotherCustomerIsRefusedAndNothingIsBooked() throws Exception {
        User organizer = saveUser(Role.ORGANIZER);
        Venue venue = saveVenue(organizer);
        Seat a1 = saveSeat(venue, "VIP", "A", "1");
        Seat a2 = saveSeat(venue, "VIP", "A", "2");
        Event event = draftEvent(organizer, venue, SeatingMode.RESERVED_SEATING, now.plus(10, ChronoUnit.DAYS));
        addSection(event, "VIP", "2500.00", "VIP");
        publish(event);

        book(saveUser(Role.CUSTOMER), seatJson(event.getId(), a1)).andExpect(status().isCreated());
        book(saveUser(Role.CUSTOMER), seatJson(event.getId(), a1, a2))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail", containsString("VIP A1")));

        assertThat(bookingSeats.countByEventIdAndReleasedAtIsNull(event.getId())).isEqualTo(1); // a2 not taken
    }

    @Test
    void seatsOfAnotherVenueOrUnsoldSectionsAreRejected() throws Exception {
        User organizer = saveUser(Role.ORGANIZER);
        Venue venue = saveVenue(organizer);
        Venue otherVenue = saveVenue(organizer);
        Seat foreign = saveSeat(otherVenue, "VIP", "A", "1");
        Seat unsold = saveSeat(venue, "Standing", "C", "1"); // no ticket type for this section
        saveSeat(venue, "VIP", "A", "1");
        Event event = draftEvent(organizer, venue, SeatingMode.RESERVED_SEATING, now.plus(10, ChronoUnit.DAYS));
        addSection(event, "VIP", "2500.00", "VIP");
        publish(event);
        User customer = saveUser(Role.CUSTOMER);

        book(customer, seatJson(event.getId(), foreign)).andExpect(status().isBadRequest());
        book(customer, seatJson(event.getId(), unsold)).andExpect(status().isBadRequest());
    }

    @Test
    void anExpiredHoldIsReleasedSoTheSeatCanBeBookedAgain() throws Exception {
        User organizer = saveUser(Role.ORGANIZER);
        Venue venue = saveVenue(organizer);
        Seat a1 = saveSeat(venue, "VIP", "A", "1");
        Event event = draftEvent(organizer, venue, SeatingMode.RESERVED_SEATING, now.plus(10, ChronoUnit.DAYS));
        TicketType vip = addSection(event, "VIP", "2500.00", "VIP");
        publish(event);

        // An earlier customer's unpaid hold that ran out a minute ago.
        Booking stale = new Booking(saveUser(Role.CUSTOMER), event, BookingReference.generate(),
                now.minus(1, ChronoUnit.MINUTES));
        stale.addSeat(a1, vip);
        bookings.saveAndFlush(stale);

        book(saveUser(Role.CUSTOMER), seatJson(event.getId(), a1)).andExpect(status().isCreated());

        em.clear();
        Booking reloaded = bookings.findById(stale.getId()).orElseThrow();
        assertThat(reloaded.getStatus()).isEqualTo(BookingStatus.EXPIRED);
        assertThat(reloaded.getSeats().get(0).isActive()).isFalse();
        assertThat(bookingSeats.countByEventIdAndReleasedAtIsNull(event.getId())).isEqualTo(1);
    }

    // ---------- shape, existence and access ----------

    @Test
    void wrongRequestShapeForTheSeatingModeIsRejected() throws Exception {
        User organizer = saveUser(Role.ORGANIZER);
        Venue venue = saveVenue(organizer);
        Seat a1 = saveSeat(venue, "VIP", "A", "1");
        Event ga = draftEvent(organizer, venue, SeatingMode.GENERAL_ADMISSION, now.plus(10, ChronoUnit.DAYS));
        TicketType standing = addGa(ga, "Standing", "100.00", 10, 4, null);
        publish(ga);
        Event reserved = draftEvent(organizer, venue, SeatingMode.RESERVED_SEATING, now.plus(11, ChronoUnit.DAYS));
        addSection(reserved, "VIP", "2500.00", "VIP");
        publish(reserved);
        User customer = saveUser(Role.CUSTOMER);

        book(customer, seatJson(ga.getId(), a1)).andExpect(status().isBadRequest());           // seats for a GA event
        book(customer, gaJson(reserved.getId(), standing.getId(), 1)).andExpect(status().isBadRequest()); // tickets for a seated event
        book(customer, "{\"eventId\":" + ga.getId() + "}").andExpect(status().isBadRequest()); // nothing chosen
        book(customer, "{}").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.eventId").exists());
    }

    @Test
    void unknownDraftAndCancelledEventsCannotBeBooked() throws Exception {
        User organizer = saveUser(Role.ORGANIZER);
        Venue venue = saveVenue(organizer);
        Event draft = draftEvent(organizer, venue, SeatingMode.GENERAL_ADMISSION, now.plus(10, ChronoUnit.DAYS));
        TicketType draftType = addGa(draft, "Standing", "100.00", 10, 4, null);
        Event cancelled = draftEvent(organizer, venue, SeatingMode.GENERAL_ADMISSION, now.plus(11, ChronoUnit.DAYS));
        TicketType cancelledType = addGa(cancelled, "Standing", "100.00", 10, 4, null);
        publish(cancelled);
        cancelled.cancel();
        events.saveAndFlush(cancelled);
        User customer = saveUser(Role.CUSTOMER);

        book(customer, gaJson(999_999_999L, 1, 1)).andExpect(status().isNotFound());
        book(customer, gaJson(draft.getId(), draftType.getId(), 1)).andExpect(status().isNotFound());
        book(customer, gaJson(cancelled.getId(), cancelledType.getId(), 1)).andExpect(status().isNotFound());
    }

    @Test
    void anonymousAndDisabledUsersCannotBook() throws Exception {
        User organizer = saveUser(Role.ORGANIZER);
        Event event = draftEvent(organizer, saveVenue(organizer), SeatingMode.GENERAL_ADMISSION,
                now.plus(10, ChronoUnit.DAYS));
        TicketType standing = addGa(event, "Standing", "100.00", 10, 4, null);
        publish(event);

        mockMvc.perform(post("/api/bookings").contentType(MediaType.APPLICATION_JSON)
                        .content(gaJson(event.getId(), standing.getId(), 1)))
                .andExpect(status().isUnauthorized());

        User customer = saveUser(Role.CUSTOMER);
        String oldToken = bearer(customer);
        customer.setEnabled(false);
        users.saveAndFlush(customer);
        mockMvc.perform(post("/api/bookings").header("Authorization", oldToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(gaJson(event.getId(), standing.getId(), 1)))
                .andExpect(status().isForbidden());
    }

    // ---------- idempotency ----------

    @Test
    void repeatingARequestWithTheSameKeyReturnsTheOriginalBookingWithoutBookingTwice() throws Exception {
        User organizer = saveUser(Role.ORGANIZER);
        Event event = draftEvent(organizer, saveVenue(organizer), SeatingMode.GENERAL_ADMISSION,
                now.plus(10, ChronoUnit.DAYS));
        TicketType standing = addGa(event, "Standing", "100.00", 100, 4, null);
        publish(event);
        User customer = saveUser(Role.CUSTOMER);
        String json = gaJson(event.getId(), standing.getId(), 2);

        MvcResult first = bookWithKey(customer, json, "key-12345678").andExpect(status().isCreated()).andReturn();
        Number firstId = JsonPath.read(first.getResponse().getContentAsString(), "$.id");

        bookWithKey(customer, json, "key-12345678")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(firstId.intValue()));

        bookWithKey(customer, gaJson(event.getId(), standing.getId(), 3), "key-12345678")
                .andExpect(status().isConflict()); // same key, different request

        assertThat(bookings.count()).isEqualTo(1);
        em.clear();
        mockMvc.perform(get("/api/events/{id}", event.getId()))
                .andExpect(jsonPath("$.ticketTypes[0].quantityRemaining").value(98)); // only one booking's worth
    }
}