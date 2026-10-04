package com.eventhub.event;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.eventhub.TestcontainersConfiguration;
import com.eventhub.security.JwtTokenService;
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
import java.util.Locale;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@ActiveProfiles("test")
@Transactional
class TicketTypeControllerTest {

    private final Instant start = Instant.now().plus(30, ChronoUnit.DAYS);
    private final Instant end = start.plus(3, ChronoUnit.HOURS);

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
    private PasswordEncoder passwordEncoder;
    @Autowired
    private JwtTokenService tokenService;

    private User saveOrganizer() {
        String email = "organizer-" + UUID.randomUUID() + "@example.com";
        return users.saveAndFlush(new User(email, passwordEncoder.encode("Sup3rSecret!"), "Org", Role.ORGANIZER));
    }

    private String bearer(User user) {
        return "Bearer " + tokenService.issueFor(user).value();
    }

    private Venue saveVenue(User owner) { // capacity 500
        return venues.saveAndFlush(new Venue(owner, "City Hall", "1 Main Road", "Agra",
                null, "India", "Asia/Kolkata", 500));
    }

    private Event saveEvent(User organizer, Venue venue, SeatingMode mode) {
        return events.saveAndFlush(new Event(organizer, venue, "Concert", null, "MUSIC", null,
                start, end, mode, "INR"));
    }

    private String gaJson(String name, String price, int quantity) {
        return """
                {"name":"%s","price":%s,"quantityTotal":%d}
                """.formatted(name, price, quantity);
    }

    private String reservedJson(String name, String price, String section) {
        return """
                {"name":"%s","price":%s,"seatSection":"%s"}
                """.formatted(name, price, section);
    }

    private ResultActions postType(User actor, long eventId, String json) throws Exception {
        return mockMvc.perform(post("/api/organizer/events/{id}/ticket-types", eventId)
                .header("Authorization", bearer(actor))
                .contentType(MediaType.APPLICATION_JSON).content(json));
    }

    private ResultActions publish(User actor, long eventId) throws Exception {
        return mockMvc.perform(post("/api/organizer/events/{id}/publish", eventId)
                .header("Authorization", bearer(actor)));
    }

    @Test
    void organizerAddsAGeneralAdmissionTicketType() throws Exception {
        User organizer = saveOrganizer();
        Event event = saveEvent(organizer, saveVenue(organizer), SeatingMode.GENERAL_ADMISSION);

        postType(organizer, event.getId(), gaJson("Standing", "499.50", 200))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Standing"))
                .andExpect(jsonPath("$.price").value(499.5))
                .andExpect(jsonPath("$.quantityTotal").value(200))
                .andExpect(jsonPath("$.quantityRemaining").value(200))
                .andExpect(jsonPath("$.maxPerBooking").value(10));
    }

    @Test
    void generalAdmissionTicketTypeNeedsAQuantity() throws Exception {
        User organizer = saveOrganizer();
        Event event = saveEvent(organizer, saveVenue(organizer), SeatingMode.GENERAL_ADMISSION);

        postType(organizer, event.getId(), reservedJson("VIP", "500", "VIP"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void reservedSeatingTicketTypeNeedsASectionAndNoQuantity() throws Exception {
        User organizer = saveOrganizer();
        Event event = saveEvent(organizer, saveVenue(organizer), SeatingMode.RESERVED_SEATING);

        postType(organizer, event.getId(), gaJson("Standing", "100", 50))
                .andExpect(status().isBadRequest());

        postType(organizer, event.getId(), reservedJson("VIP", "2500", "VIP"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.seatSection").value("VIP"))
                .andExpect(jsonPath("$.quantityTotal").doesNotExist());
    }

    @Test
    void ticketsCannotExceedTheVenueCapacity() throws Exception {
        User organizer = saveOrganizer();
        Event event = saveEvent(organizer, saveVenue(organizer), SeatingMode.GENERAL_ADMISSION);

        postType(organizer, event.getId(), gaJson("Early", "100", 400)).andExpect(status().isCreated());
        postType(organizer, event.getId(), gaJson("Late", "150", 200)).andExpect(status().isBadRequest());
        postType(organizer, event.getId(), gaJson("Late", "150", 100)).andExpect(status().isCreated());
    }

    @Test
    void duplicateNamesAreRejectedIgnoringCase() throws Exception {
        User organizer = saveOrganizer();
        Event event = saveEvent(organizer, saveVenue(organizer), SeatingMode.GENERAL_ADMISSION);

        postType(organizer, event.getId(), gaJson("Standing", "100", 10)).andExpect(status().isCreated());
        postType(organizer, event.getId(), gaJson("STANDING", "120", 10)).andExpect(status().isConflict());
    }

    @Test
    void salesCannotCloseAfterTheEventEnds() throws Exception {
        User organizer = saveOrganizer();
        Event event = saveEvent(organizer, saveVenue(organizer), SeatingMode.GENERAL_ADMISSION);

        postType(organizer, event.getId(), """
                {"name":"Late","price":10,"quantityTotal":10,"salesEnd":"%s"}
                """.formatted(end.plus(1, ChronoUnit.HOURS)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void badPricesGiveValidationErrors() throws Exception {
        User organizer = saveOrganizer();
        Event event = saveEvent(organizer, saveVenue(organizer), SeatingMode.GENERAL_ADMISSION);

        postType(organizer, event.getId(), gaJson("Negative", "-5.00", 10))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.price").exists());
        postType(organizer, event.getId(), gaJson("Fractions", "10.505", 10))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.price").exists());
    }

    @Test
    void ticketTypesOfAPublishedEventCannotBeChanged() throws Exception {
        User organizer = saveOrganizer();
        Event event = saveEvent(organizer, saveVenue(organizer), SeatingMode.GENERAL_ADMISSION);
        TicketType type = ticketTypes.saveAndFlush(TicketType.generalAdmission(event, "Standing",
                new BigDecimal("100.00"), 100, 4, null, null));
        event.publish();
        events.saveAndFlush(event);

        postType(organizer, event.getId(), gaJson("Extra", "50", 10)).andExpect(status().isConflict());
        mockMvc.perform(delete("/api/organizer/events/{e}/ticket-types/{t}", event.getId(), type.getId())
                        .header("Authorization", bearer(organizer)))
                .andExpect(status().isConflict());
        assertThat(ticketTypes.countByEventId(event.getId())).isEqualTo(1);
    }

    @Test
    void organizerCanListAndDeleteTicketTypesOfADraft() throws Exception {
        User organizer = saveOrganizer();
        Event event = saveEvent(organizer, saveVenue(organizer), SeatingMode.GENERAL_ADMISSION);
        postType(organizer, event.getId(), gaJson("Standing", "100", 10)).andExpect(status().isCreated());
        Long typeId = ticketTypes.findByEventIdOrderByIdAsc(event.getId()).get(0).getId();

        mockMvc.perform(get("/api/organizer/events/{id}/ticket-types", event.getId())
                        .header("Authorization", bearer(organizer)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));

        mockMvc.perform(delete("/api/organizer/events/{e}/ticket-types/{t}", event.getId(), typeId)
                        .header("Authorization", bearer(organizer)))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/organizer/events/{id}/ticket-types", event.getId())
                        .header("Authorization", bearer(organizer)))
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void anotherOrganizerCannotSeeAddOrDeleteTicketTypes() throws Exception {
        User owner = saveOrganizer();
        User intruder = saveOrganizer();
        Event event = saveEvent(owner, saveVenue(owner), SeatingMode.GENERAL_ADMISSION);
        TicketType type = ticketTypes.saveAndFlush(TicketType.generalAdmission(event, "Standing",
                new BigDecimal("100.00"), 100, 4, null, null));

        postType(intruder, event.getId(), gaJson("Hijack", "1", 1)).andExpect(status().isNotFound());
        mockMvc.perform(get("/api/organizer/events/{id}/ticket-types", event.getId())
                        .header("Authorization", bearer(intruder)))
                .andExpect(status().isNotFound());
        mockMvc.perform(delete("/api/organizer/events/{e}/ticket-types/{t}", event.getId(), type.getId())
                        .header("Authorization", bearer(intruder)))
                .andExpect(status().isNotFound());

        assertThat(ticketTypes.countByEventId(event.getId())).isEqualTo(1);
    }

    @Test
    void aTicketTypeCannotBeDeletedThroughADifferentEvent() throws Exception {
        User organizer = saveOrganizer();
        Venue venue = saveVenue(organizer);
        Event first = saveEvent(organizer, venue, SeatingMode.GENERAL_ADMISSION);
        Event second = saveEvent(organizer, venue, SeatingMode.GENERAL_ADMISSION);
        TicketType type = ticketTypes.saveAndFlush(TicketType.generalAdmission(first, "Standing",
                new BigDecimal("100.00"), 100, 4, null, null));

        mockMvc.perform(delete("/api/organizer/events/{e}/ticket-types/{t}", second.getId(), type.getId())
                        .header("Authorization", bearer(organizer)))
                .andExpect(status().isNotFound());

        assertThat(ticketTypes.countByEventId(first.getId())).isEqualTo(1);
    }

    @Test
    void publishingRequiresAtLeastOneTicketType() throws Exception {
        User organizer = saveOrganizer();
        Event event = saveEvent(organizer, saveVenue(organizer), SeatingMode.GENERAL_ADMISSION);

        publish(organizer, event.getId()).andExpect(status().isConflict());

        postType(organizer, event.getId(), gaJson("Standing", "100", 10)).andExpect(status().isCreated());
        publish(organizer, event.getId())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PUBLISHED"));
    }

    @Test
    void reservedSeatingEventNeedsSeatsInEveryTicketSectionToPublish() throws Exception {
        User organizer = saveOrganizer();
        Venue venue = saveVenue(organizer);
        Event event = saveEvent(organizer, venue, SeatingMode.RESERVED_SEATING);
        postType(organizer, event.getId(), reservedJson("VIP", "2500", "VIP")).andExpect(status().isCreated());

        publish(organizer, event.getId()).andExpect(status().isConflict()); // venue has no VIP seats yet

        seats.saveAndFlush(new Seat(venue, "VIP", "A", "1"));
        publish(organizer, event.getId())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PUBLISHED"));
    }
}