package com.eventhub.booking;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.eventhub.TestcontainersConfiguration;
import com.eventhub.event.Event;
import com.eventhub.event.EventRepository;
import com.eventhub.event.SeatingMode;
import com.eventhub.event.TicketType;
import com.eventhub.testsupport.TestFixtures;
import com.eventhub.user.Role;
import com.eventhub.user.User;
import com.eventhub.user.UserRepository;
import com.eventhub.venue.Venue;
import com.jayway.jsonpath.JsonPath;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
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
class CheckInTest {

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
    private TicketRepository tickets;

    // ---------- helpers ----------

    /** A general-admission event starting in one hour (check-in opens 6 hours before the start). */
    private Event soonEvent(User organizer, Venue venue, int cutoffHours) {
        Event event = fx.draft(organizer, venue, SeatingMode.GENERAL_ADMISSION, now.plus(1, ChronoUnit.HOURS));
        event.setCancellationCutoffHours(cutoffHours);
        events.saveAndFlush(event);
        return event;
    }

    private TicketType addType(Event event) {
        return fx.gaType(event, "Standing", "100.00", 100, 4);
    }

    private long bookAndPay(User customer, Event event, TicketType type, int quantity) throws Exception {
        String json = """
                {"eventId":%d,"items":[{"ticketTypeId":%d,"quantity":%d}]}
                """.formatted(event.getId(), type.getId(), quantity);
        String body = mockMvc.perform(post("/api/bookings").header("Authorization", fx.bearer(customer))
                        .contentType(MediaType.APPLICATION_JSON).content(json))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        long bookingId = ((Number) JsonPath.read(body, "$.id")).longValue();
        mockMvc.perform(post("/api/bookings/" + bookingId + "/demo-payment")
                        .header("Authorization", fx.bearer(customer)))
                .andExpect(status().isOk());
        return bookingId;
    }

    private List<String> codesOf(long bookingId) {
        return tickets.findByBookingId(bookingId).stream().map(Ticket::getCode).toList();
    }

    private ResultActions checkIn(User organizer, long eventId, String code) throws Exception {
        return mockMvc.perform(post("/api/organizer/events/" + eventId + "/check-ins")
                .header("Authorization", fx.bearer(organizer))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"code\":\"" + code + "\"}"));
    }

    private User namedCustomer(String fullName) {
        return users.saveAndFlush(new User(UUID.randomUUID() + "@example.com", "hash", fullName, Role.CUSTOMER));
    }

    // ---------- tests ----------

    @Test
    void organizerChecksInAValidTicketAndSeesTheHoldersNameButNotTheirEmail() throws Exception {
        User organizer = fx.user(Role.ORGANIZER);
        Event event = soonEvent(organizer, fx.venue(organizer), 24);
        TicketType type = addType(event);
        fx.publish(event);
        long bookingId = bookAndPay(namedCustomer("Ana Verma"), event, type, 1);
        String code = codesOf(bookingId).get(0);

        checkIn(organizer, event.getId(), code)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CHECKED_IN"))
                .andExpect(jsonPath("$.holderName").value("Ana Verma"))
                .andExpect(jsonPath("$.ticketTypeName").value("Standing"))
                .andExpect(jsonPath("$.checkedInAt").isNotEmpty())
                .andExpect(jsonPath("$.email").doesNotExist());

        Ticket stored = tickets.findByCodeAndEventId(code, event.getId()).orElseThrow();
        assertThat(stored.getStatus()).isEqualTo(TicketStatus.CHECKED_IN);
        assertThat(stored.getCheckedInBy()).isEqualTo(organizer.getId());
    }

    @Test
    void scanningTheSameTicketTwiceIsRefusedAndKeepsTheFirstTime() throws Exception {
        User organizer = fx.user(Role.ORGANIZER);
        Event event = soonEvent(organizer, fx.venue(organizer), 24);
        TicketType type = addType(event);
        fx.publish(event);
        String code = codesOf(bookAndPay(fx.user(Role.CUSTOMER), event, type, 1)).get(0);

        checkIn(organizer, event.getId(), code).andExpect(status().isOk());
        Instant firstTime = tickets.findByCodeAndEventId(code, event.getId()).orElseThrow().getCheckedInAt();

        checkIn(organizer, event.getId(), code)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail", containsString("already checked in")));
        assertThat(tickets.findByCodeAndEventId(code, event.getId()).orElseThrow().getCheckedInAt())
                .isEqualTo(firstTime);
    }

    @Test
    void unknownCodesAndTicketsOfAnotherEventAreNotFound() throws Exception {
        User organizer = fx.user(Role.ORGANIZER);
        Venue venue = fx.venue(organizer);
        Event eventA = soonEvent(organizer, venue, 24);
        TicketType typeA = addType(eventA);
        fx.publish(eventA);
        Event eventB = soonEvent(organizer, venue, 24);
        addType(eventB);
        fx.publish(eventB);
        String codeOfA = codesOf(bookAndPay(fx.user(Role.CUSTOMER), eventA, typeA, 1)).get(0);

        checkIn(organizer, eventA.getId(), "TK-NOTAREALCODE00000000").andExpect(status().isNotFound());
        checkIn(organizer, eventB.getId(), codeOfA).andExpect(status().isNotFound()); // right code, wrong event
        assertThat(tickets.findByCodeAndEventId(codeOfA, eventA.getId()).orElseThrow().getStatus())
                .isEqualTo(TicketStatus.VALID);
    }

    @Test
    void aVoidTicketCannotBeUsed() throws Exception {
        User organizer = fx.user(Role.ORGANIZER);
        Event event = soonEvent(organizer, fx.venue(organizer), 0); // customers may cancel until the start
        TicketType type = addType(event);
        fx.publish(event);
        User ana = fx.user(Role.CUSTOMER);
        long bookingId = bookAndPay(ana, event, type, 1);
        String code = codesOf(bookingId).get(0);
        mockMvc.perform(post("/api/bookings/" + bookingId + "/cancel").header("Authorization", fx.bearer(ana)))
                .andExpect(status().isOk());

        checkIn(organizer, event.getId(), code)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail", containsString("void")));
    }

    @Test
    void checkInOnlyWorksForPublishedEventsInsideTheWindow() throws Exception {
        User organizer = fx.user(Role.ORGANIZER);
        Venue venue = fx.venue(organizer);

        // Too early: starts in 10 days, check-in opens 6 hours before.
        Event far = fx.draft(organizer, venue, SeatingMode.GENERAL_ADMISSION, now.plus(10, ChronoUnit.DAYS));
        TicketType farType = addType(far);
        fx.publish(far);
        String farCode = codesOf(bookAndPay(fx.user(Role.CUSTOMER), far, farType, 1)).get(0);
        checkIn(organizer, far.getId(), farCode)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail", containsString("opens")));

        // A cancelled event admits nobody.
        Event cancelled = soonEvent(organizer, venue, 24);
        TicketType cancelledType = addType(cancelled);
        fx.publish(cancelled);
        String cancelledCode = codesOf(bookAndPay(fx.user(Role.CUSTOMER), cancelled, cancelledType, 1)).get(0);
        mockMvc.perform(post("/api/organizer/events/" + cancelled.getId() + "/cancel")
                        .header("Authorization", fx.bearer(organizer)))
                .andExpect(status().isOk());
        checkIn(organizer, cancelled.getId(), cancelledCode)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail", containsString("published")));
    }

    @Test
    void onlyTheEventsOwnOrganizerMayCheckPeopleIn() throws Exception {
        User organizer = fx.user(Role.ORGANIZER);
        Event event = soonEvent(organizer, fx.venue(organizer), 24);
        TicketType type = addType(event);
        fx.publish(event);
        String code = codesOf(bookAndPay(fx.user(Role.CUSTOMER), event, type, 1)).get(0);

        checkIn(fx.user(Role.ORGANIZER), event.getId(), code).andExpect(status().isNotFound());
        checkIn(fx.user(Role.CUSTOMER), event.getId(), code).andExpect(status().isForbidden());
        mockMvc.perform(post("/api/organizer/events/" + event.getId() + "/check-ins")
                        .contentType(MediaType.APPLICATION_JSON).content("{\"code\":\"" + code + "\"}"))
                .andExpect(status().isUnauthorized());
        assertThat(tickets.findByCodeAndEventId(code, event.getId()).orElseThrow().getStatus())
                .isEqualTo(TicketStatus.VALID);
    }

    @Test
    void codesAreMatchedIgnoringCaseAndSurroundingSpaces() throws Exception {
        User organizer = fx.user(Role.ORGANIZER);
        Event event = soonEvent(organizer, fx.venue(organizer), 24);
        TicketType type = addType(event);
        fx.publish(event);
        String code = codesOf(bookAndPay(fx.user(Role.CUSTOMER), event, type, 1)).get(0);

        checkIn(organizer, event.getId(), "  " + code.toLowerCase() + "  ")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CHECKED_IN"));
    }

    @Test
    void attendanceCountsTicketsInEveryState() throws Exception {
        User organizer = fx.user(Role.ORGANIZER);
        Event event = soonEvent(organizer, fx.venue(organizer), 0);
        TicketType type = addType(event);
        fx.publish(event);
        long anaBooking = bookAndPay(fx.user(Role.CUSTOMER), event, type, 2);
        User ben = fx.user(Role.CUSTOMER);
        long benBooking = bookAndPay(ben, event, type, 1);
        mockMvc.perform(post("/api/bookings/" + benBooking + "/cancel").header("Authorization", fx.bearer(ben)))
                .andExpect(status().isOk());
        checkIn(organizer, event.getId(), codesOf(anaBooking).get(0)).andExpect(status().isOk());

        mockMvc.perform(get("/api/organizer/events/" + event.getId() + "/attendance")
                        .header("Authorization", fx.bearer(organizer)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(3))
                .andExpect(jsonPath("$.checkedIn").value(1))
                .andExpect(jsonPath("$.notYetArrived").value(1))
                .andExpect(jsonPath("$.voided").value(1));
    }
}