package com.eventhub.event;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.eventhub.TestcontainersConfiguration;
import com.eventhub.security.JwtTokenService;
import com.eventhub.user.Role;
import com.eventhub.user.User;
import com.eventhub.user.UserRepository;
import com.eventhub.venue.Venue;
import com.eventhub.venue.VenueRepository;
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
import java.math.BigDecimal;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@ActiveProfiles("test")
@Transactional
class OrganizerEventControllerTest {

    private final Instant start = Instant.now().plus(30, ChronoUnit.DAYS);
    private final Instant end = start.plus(3, ChronoUnit.HOURS);

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private UserRepository users;
    @Autowired
    private VenueRepository venues;
    @Autowired
    private EventRepository events;
    @Autowired
    private TicketTypeRepository ticketTypes;
    @Autowired
    private PasswordEncoder passwordEncoder;
    @Autowired
    private JwtTokenService tokenService;

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

    private Event saveDraft(User organizer, Venue venue, String title) {
        return events.saveAndFlush(new Event(organizer, venue, title, null, "MUSIC", null,
                start, end, SeatingMode.GENERAL_ADMISSION, "INR"));
    }
    
    private void addTicketType(Event event) {
        ticketTypes.saveAndFlush(TicketType.generalAdmission(event, "Standing",
                new BigDecimal("100.00"), 100, 4, null, null));
    }

    private String createJson(long venueId, Instant startsAt, Instant endsAt, String extra) {
        return """
                {"venueId":%d,"title":"Concert","description":"A night of music","category":"MUSIC",
                 "startsAt":"%s","endsAt":"%s","seatingMode":"GENERAL_ADMISSION"%s}
                """.formatted(venueId, startsAt, endsAt, extra);
    }

    private String updateJson(String title) {
        return """
                {"title":"%s","description":"Updated","category":"MUSIC","startsAt":"%s","endsAt":"%s"}
                """.formatted(title, start, end);
    }

    private ResultActions postEvent(User actor, String json) throws Exception {
        return mockMvc.perform(post("/api/organizer/events")
                .header("Authorization", bearer(actor))
                .contentType(MediaType.APPLICATION_JSON).content(json));
    }

    private ResultActions action(String method, User actor, long eventId, String suffix) throws Exception {
        String url = "/api/organizer/events/" + eventId + suffix;
        if (method.equals("PUT")) {
            return mockMvc.perform(put(url).header("Authorization", bearer(actor))
                    .contentType(MediaType.APPLICATION_JSON).content(updateJson("Hijacked")));
        }
        if (method.equals("GET")) {
            return mockMvc.perform(get(url).header("Authorization", bearer(actor)));
        }
        return mockMvc.perform(post(url).header("Authorization", bearer(actor)));
    }

    @Test
    void organizerCreatesADraftEventWithDefaults() throws Exception {
        User organizer = saveUser(Role.ORGANIZER);
        Venue venue = saveVenue(organizer);

        postEvent(organizer, createJson(venue.getId(), start, end, ""))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("DRAFT"))
                .andExpect(jsonPath("$.currency").value("INR"))
                .andExpect(jsonPath("$.cancellationCutoffHours").value(24))
                .andExpect(jsonPath("$.venue.timeZone").value("Asia/Kolkata"));
    }

    @Test
    void organizerCannotUseAnotherOrganizersVenue() throws Exception {
        User owner = saveUser(Role.ORGANIZER);
        User intruder = saveUser(Role.ORGANIZER);
        Venue venue = saveVenue(owner);

        postEvent(intruder, createJson(venue.getId(), start, end, ""))
                .andExpect(status().isNotFound());
    }

    @Test
    void eventStartingInThePastIsRejected() throws Exception {
        User organizer = saveUser(Role.ORGANIZER);
        Venue venue = saveVenue(organizer);
        Instant past = Instant.now().minus(2, ChronoUnit.DAYS);

        postEvent(organizer, createJson(venue.getId(), past, past.plus(3, ChronoUnit.HOURS), ""))
                .andExpect(status().isBadRequest());
    }

    @Test
    void eventEndingBeforeItStartsIsRejected() throws Exception {
        User organizer = saveUser(Role.ORGANIZER);
        Venue venue = saveVenue(organizer);

        postEvent(organizer, createJson(venue.getId(), start, start.minus(1, ChronoUnit.HOURS), ""))
                .andExpect(status().isBadRequest());
    }

    @Test
    void javascriptImageUrlIsRejected() throws Exception {
        User organizer = saveUser(Role.ORGANIZER);
        Venue venue = saveVenue(organizer);

        postEvent(organizer, createJson(venue.getId(), start, end, ",\"imageUrl\":\"javascript:alert(1)\""))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.imageUrl").exists());
    }

    @Test
    void unknownCurrencyCodeIsRejected() throws Exception {
        User organizer = saveUser(Role.ORGANIZER);
        Venue venue = saveVenue(organizer);

        postEvent(organizer, createJson(venue.getId(), start, end, ",\"currency\":\"ZZZ\""))
                .andExpect(status().isBadRequest());
    }

    @Test
    void draftEventCanBeEdited() throws Exception {
        User organizer = saveUser(Role.ORGANIZER);
        Event event = saveDraft(organizer, saveVenue(organizer), "Old title");

        action("PUT", organizer, event.getId(), "")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Hijacked"));
    }

    @Test
    void publishedEventCannotBeEditedUntilUnpublished() throws Exception {
        User organizer = saveUser(Role.ORGANIZER);
        Event event = saveDraft(organizer, saveVenue(organizer), "Concert");
        addTicketType(event);
        action("POST", organizer, event.getId(), "/publish").andExpect(status().isOk());

        action("PUT", organizer, event.getId(), "").andExpect(status().isConflict());

        action("POST", organizer, event.getId(), "/unpublish").andExpect(status().isOk());
        action("PUT", organizer, event.getId(), "").andExpect(status().isOk());
    }

    @Test
    void eventLifecycleFollowsTheAllowedTransitions() throws Exception {
        User organizer = saveUser(Role.ORGANIZER);
        Event event = saveDraft(organizer, saveVenue(organizer), "Concert");
        addTicketType(event);
        long id = event.getId();

        action("POST", organizer, id, "/publish")
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("PUBLISHED"));
        action("POST", organizer, id, "/publish").andExpect(status().isConflict());
        action("POST", organizer, id, "/unpublish")
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("DRAFT"));
        action("POST", organizer, id, "/unpublish").andExpect(status().isConflict());
        action("POST", organizer, id, "/cancel")
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("CANCELLED"));
        action("POST", organizer, id, "/publish").andExpect(status().isConflict());
        action("POST", organizer, id, "/cancel").andExpect(status().isConflict());
    }

    @Test
    void organizerCannotViewEditPublishOrCancelAnotherOrganizersEvent() throws Exception {
        User owner = saveUser(Role.ORGANIZER);
        User intruder = saveUser(Role.ORGANIZER);
        Event event = saveDraft(owner, saveVenue(owner), "Private plans");
        long id = event.getId();

        action("GET", intruder, id, "").andExpect(status().isNotFound());
        action("PUT", intruder, id, "").andExpect(status().isNotFound());
        action("POST", intruder, id, "/publish").andExpect(status().isNotFound());
        action("POST", intruder, id, "/unpublish").andExpect(status().isNotFound());
        action("POST", intruder, id, "/cancel").andExpect(status().isNotFound());

        Event unchanged = events.findById(id).orElseThrow();
        assertThat(unchanged.getStatus()).isEqualTo(EventStatus.DRAFT);
        assertThat(unchanged.getTitle()).isEqualTo("Private plans");
    }

    @Test
    void organizerListShowsOnlyOwnEventsAndSupportsAStatusFilter() throws Exception {
        User organizer = saveUser(Role.ORGANIZER);
        User other = saveUser(Role.ORGANIZER);
        Venue venue = saveVenue(organizer);
        saveDraft(organizer, venue, "Draft one");
        Event live = saveDraft(organizer, venue, "Live one");
        live.publish();
        events.saveAndFlush(live);
        saveDraft(other, saveVenue(other), "Not mine");

        mockMvc.perform(get("/api/organizer/events").header("Authorization", bearer(organizer)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(2));

        mockMvc.perform(get("/api/organizer/events").param("status", "PUBLISHED")
                        .header("Authorization", bearer(organizer)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].title").value("Live one"));
    }

    @Test
    void demotedOrganizersOldTokenIsRefusedImmediately() throws Exception {
        User organizer = saveUser(Role.ORGANIZER);
        Venue venue = saveVenue(organizer);
        String oldToken = bearer(organizer); // still claims ROLE ORGANIZER

        organizer.setRole(Role.CUSTOMER);
        users.saveAndFlush(organizer);

        mockMvc.perform(post("/api/organizer/events").header("Authorization", oldToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createJson(venue.getId(), start, end, "")))
                .andExpect(status().isForbidden());
    }

    @Test
    void customersCannotCreateEvents() throws Exception {
        User customer = saveUser(Role.CUSTOMER);
        User organizer = saveUser(Role.ORGANIZER);
        Venue venue = saveVenue(organizer);

        postEvent(customer, createJson(venue.getId(), start, end, ""))
                .andExpect(status().isForbidden());
    }
}