package com.eventhub.event;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.hasSize;
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
import com.eventhub.venue.Venue;
import com.eventhub.venue.VenueRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@ActiveProfiles("test")
@Transactional
class PublicEventControllerTest {

    private final Instant now = Instant.now();

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

    private User saveOrganizer() {
        String email = "organizer-" + UUID.randomUUID() + "@example.com";
        return users.saveAndFlush(new User(email, passwordEncoder.encode("Sup3rSecret!"), "Asha Events", Role.ORGANIZER));
    }

    private Venue saveVenue(User owner, String city) {
        return venues.saveAndFlush(new Venue(owner, "Hall in " + city, "1 Main Road", city,
                null, "India", "Asia/Kolkata", 500));
    }

    private Event draftEvent(User organizer, Venue venue, String title, String category, Instant start) {
        return events.saveAndFlush(new Event(organizer, venue, title, "About " + title, category, null,
                start, start.plus(3, ChronoUnit.HOURS), SeatingMode.GENERAL_ADMISSION, "INR"));
    }

    /** A published event with one "Standing" ticket type at the given price. */
    private Event publishedEvent(User organizer, Venue venue, String title, String category,
                                 Instant start, String price) {
        Event event = draftEvent(organizer, venue, title, category, start);
        ticketTypes.saveAndFlush(TicketType.generalAdmission(event, "Standing",
                new BigDecimal(price), 100, 4, null, null));
        event.setStartingPrice(new BigDecimal(price));
        event.publish();
        return events.saveAndFlush(event);
    }

    private Instant inDays(int days) {
        return now.plus(days, ChronoUnit.DAYS);
    }

    @Test
    void anonymousVisitorsCanBrowsePublishedEvents() throws Exception {
        User organizer = saveOrganizer();
        publishedEvent(organizer, saveVenue(organizer, "Agra"), "Jazz Night", "MUSIC", inDays(10), "500.00");

        mockMvc.perform(get("/api/events"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].title").value("Jazz Night"))
                .andExpect(jsonPath("$.content[0].city").value("Agra"))
                .andExpect(jsonPath("$.content[0].startingPrice").value(500.0))
                .andExpect(jsonPath("$.content[0].currency").value("INR"));
    }

    @Test
    void draftsAndCancelledEventsNeverAppearInTheListOrDetail() throws Exception {
        User organizer = saveOrganizer();
        Venue venue = saveVenue(organizer, "Agra");
        Event draft = draftEvent(organizer, venue, "Secret draft", "MUSIC", inDays(10));
        Event cancelled = publishedEvent(organizer, venue, "Cancelled show", "MUSIC", inDays(11), "100.00");
        cancelled.cancel();
        events.saveAndFlush(cancelled);
        Event live = publishedEvent(organizer, venue, "Live show", "MUSIC", inDays(12), "100.00");

        mockMvc.perform(get("/api/events"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[*].title", contains("Live show")));

        mockMvc.perform(get("/api/events/{id}", draft.getId())).andExpect(status().isNotFound());
        mockMvc.perform(get("/api/events/{id}", cancelled.getId())).andExpect(status().isNotFound());
        mockMvc.perform(get("/api/events/{id}", live.getId())).andExpect(status().isOk());
    }

    @Test
    void eventsThatAlreadyEndedAreNotListed() throws Exception {
        User organizer = saveOrganizer();
        publishedEvent(organizer, saveVenue(organizer, "Agra"), "Old show", "MUSIC", inDays(-5), "100.00");

        mockMvc.perform(get("/api/events"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(0));
    }

    @Test
    void searchByNameIsCaseInsensitiveAndTreatsWildcardsLiterally() throws Exception {
        User organizer = saveOrganizer();
        Venue venue = saveVenue(organizer, "Agra");
        publishedEvent(organizer, venue, "Jazz Night", "MUSIC", inDays(10), "100.00");
        publishedEvent(organizer, venue, "Rock Fest", "MUSIC", inDays(11), "100.00");
        publishedEvent(organizer, venue, "100% Fun", "MUSIC", inDays(12), "100.00");

        mockMvc.perform(get("/api/events").param("q", "jazz"))
                .andExpect(jsonPath("$.content[*].title", contains("Jazz Night")));
        mockMvc.perform(get("/api/events").param("q", "JAZZ"))
                .andExpect(jsonPath("$.content[*].title", contains("Jazz Night")));
        mockMvc.perform(get("/api/events").param("q", "%"))
                .andExpect(jsonPath("$.content[*].title", contains("100% Fun")));
        mockMvc.perform(get("/api/events").param("q", "_"))
                .andExpect(jsonPath("$.totalElements").value(0));
    }

    @Test
    void filterByCategoryAndCityIgnoringCase() throws Exception {
        User organizer = saveOrganizer();
        Venue agra = saveVenue(organizer, "Agra");
        Venue delhi = saveVenue(organizer, "Delhi");
        publishedEvent(organizer, agra, "A", "MUSIC", inDays(10), "100.00");
        publishedEvent(organizer, agra, "B", "SPORTS", inDays(11), "100.00");
        publishedEvent(organizer, delhi, "C", "MUSIC", inDays(12), "100.00");

        mockMvc.perform(get("/api/events").param("category", "music"))
                .andExpect(jsonPath("$.content[*].title", containsInAnyOrder("A", "C")));
        mockMvc.perform(get("/api/events").param("city", "agra"))
                .andExpect(jsonPath("$.content[*].title", containsInAnyOrder("A", "B")));
        mockMvc.perform(get("/api/events").param("category", "MUSIC").param("city", "Agra"))
                .andExpect(jsonPath("$.content[*].title", contains("A")));
    }

    @Test
    void filterByDateRange() throws Exception {
        User organizer = saveOrganizer();
        Venue venue = saveVenue(organizer, "Agra");
        publishedEvent(organizer, venue, "Ten", "MUSIC", inDays(10), "100.00");
        publishedEvent(organizer, venue, "Twenty", "MUSIC", inDays(20), "100.00");
        publishedEvent(organizer, venue, "Thirty", "MUSIC", inDays(30), "100.00");

        mockMvc.perform(get("/api/events")
                        .param("from", inDays(15).toString()).param("to", inDays(25).toString()))
                .andExpect(jsonPath("$.content[*].title", contains("Twenty")));
    }

    @Test
    void filterByPrice() throws Exception {
        User organizer = saveOrganizer();
        Venue venue = saveVenue(organizer, "Agra");
        publishedEvent(organizer, venue, "Free", "MUSIC", inDays(10), "0.00");
        publishedEvent(organizer, venue, "Mid", "MUSIC", inDays(11), "500.00");
        publishedEvent(organizer, venue, "Premium", "MUSIC", inDays(12), "2000.00");

        mockMvc.perform(get("/api/events").param("maxPrice", "600"))
                .andExpect(jsonPath("$.content[*].title", containsInAnyOrder("Free", "Mid")));
        mockMvc.perform(get("/api/events").param("minPrice", "100").param("maxPrice", "1000"))
                .andExpect(jsonPath("$.content[*].title", contains("Mid")));
        mockMvc.perform(get("/api/events").param("minPrice", "1000").param("maxPrice", "100"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void sortingByDateAndPrice() throws Exception {
        User organizer = saveOrganizer();
        Venue venue = saveVenue(organizer, "Agra");
        publishedEvent(organizer, venue, "Late cheap", "MUSIC", inDays(30), "100.00");
        publishedEvent(organizer, venue, "Soon pricey", "MUSIC", inDays(5), "900.00");
        publishedEvent(organizer, venue, "Middle", "MUSIC", inDays(15), "400.00");

        mockMvc.perform(get("/api/events"))
                .andExpect(jsonPath("$.content[*].title", contains("Soon pricey", "Middle", "Late cheap")));
        mockMvc.perform(get("/api/events").param("sort", "date_desc"))
                .andExpect(jsonPath("$.content[*].title", contains("Late cheap", "Middle", "Soon pricey")));
        mockMvc.perform(get("/api/events").param("sort", "price_asc"))
                .andExpect(jsonPath("$.content[*].title", contains("Late cheap", "Middle", "Soon pricey")));
        mockMvc.perform(get("/api/events").param("sort", "price_desc"))
                .andExpect(jsonPath("$.content[*].title", contains("Soon pricey", "Middle", "Late cheap")));
        mockMvc.perform(get("/api/events").param("sort", "title; DROP TABLE events"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void paginationSplitsResultsIntoPages() throws Exception {
        User organizer = saveOrganizer();
        Venue venue = saveVenue(organizer, "Agra");
        for (int i = 1; i <= 5; i++) {
            publishedEvent(organizer, venue, "E" + i, "MUSIC", inDays(i), "100.00");
        }

        mockMvc.perform(get("/api/events").param("size", "2").param("page", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(2)))
                .andExpect(jsonPath("$.content[0].title").value("E3"))
                .andExpect(jsonPath("$.totalElements").value(5))
                .andExpect(jsonPath("$.totalPages").value(3))
                .andExpect(jsonPath("$.page").value(1));
    }

    @Test
    void detailShowsTicketTypesAndAvailabilityButHidesInternals() throws Exception {
        User organizer = saveOrganizer();
        Event event = publishedEvent(organizer, saveVenue(organizer, "Agra"), "Jazz Night", "MUSIC",
                inDays(10), "499.50");

        mockMvc.perform(get("/api/events/{id}", event.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Jazz Night"))
                .andExpect(jsonPath("$.organizerName").value("Asha Events"))
                .andExpect(jsonPath("$.venue.name").value("Hall in Agra"))
                .andExpect(jsonPath("$.venue.timeZone").value("Asia/Kolkata"))
                .andExpect(jsonPath("$.seatingMode").value("GENERAL_ADMISSION"))
                .andExpect(jsonPath("$.ticketTypes[0].price").value(499.5))
                .andExpect(jsonPath("$.ticketTypes[0].quantityRemaining").value(100))
                .andExpect(jsonPath("$.ticketTypes[0].onSale").value(true))
                .andExpect(jsonPath("$.ticketTypes[0].quantitySold").doesNotExist())
                .andExpect(jsonPath("$.organizer").doesNotExist())
                .andExpect(jsonPath("$.organizerEmail").doesNotExist());
    }

    @Test
    void aTicketTypeWhoseSalesHaveNotOpenedIsNotOnSale() throws Exception {
        User organizer = saveOrganizer();
        Event event = publishedEvent(organizer, saveVenue(organizer, "Agra"), "Jazz Night", "MUSIC",
                inDays(10), "500.00");
        ticketTypes.saveAndFlush(TicketType.generalAdmission(event, "Early bird",
                new BigDecimal("400.00"), 10, 2, inDays(2), null));

        mockMvc.perform(get("/api/events/{id}", event.getId()))
                .andExpect(jsonPath("$.ticketTypes[0].name").value("Standing"))
                .andExpect(jsonPath("$.ticketTypes[0].onSale").value(true))
                .andExpect(jsonPath("$.ticketTypes[1].name").value("Early bird"))
                .andExpect(jsonPath("$.ticketTypes[1].onSale").value(false));
    }

    @Test
    void publishingThroughTheApiStoresTheCheapestTicketAsStartingPrice() throws Exception {
        User organizer = saveOrganizer();
        Event event = draftEvent(organizer, saveVenue(organizer, "Agra"), "Two prices", "MUSIC", inDays(10));
        ticketTypes.saveAndFlush(TicketType.generalAdmission(event, "Premium",
                new BigDecimal("500.00"), 50, 4, null, null));
        ticketTypes.saveAndFlush(TicketType.generalAdmission(event, "Basic",
                new BigDecimal("200.00"), 50, 4, null, null));

        mockMvc.perform(post("/api/organizer/events/{id}/publish", event.getId())
                        .header("Authorization", "Bearer " + tokenService.issueFor(organizer).value()))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/events"))
                .andExpect(jsonPath("$.content[0].title").value("Two prices"))
                .andExpect(jsonPath("$.content[0].startingPrice").value(200.0));
    }

    @Test
    void badQueryParametersGiveBadRequest() throws Exception {
        mockMvc.perform(get("/api/events").param("from", "tomorrow")).andExpect(status().isBadRequest());
        mockMvc.perform(get("/api/events").param("minPrice", "abc")).andExpect(status().isBadRequest());
        mockMvc.perform(get("/api/events").param("q", "x".repeat(101))).andExpect(status().isBadRequest());
        mockMvc.perform(get("/api/events/abc")).andExpect(status().isBadRequest());
    }

    @Test
    void onlyReadingIsPublicWritingStillNeedsALogin() throws Exception {
        mockMvc.perform(post("/api/events")).andExpect(status().isUnauthorized());
        mockMvc.perform(delete("/api/events/1")).andExpect(status().isUnauthorized());
    }
}