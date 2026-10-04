package com.eventhub.seating;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
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
import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Locale;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.stream.IntStream;
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
class OrganizerSeatControllerTest {

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

    private User saveUser(Role role) {
        String email = role.name().toLowerCase(Locale.ROOT) + "-" + UUID.randomUUID() + "@example.com";
        return users.saveAndFlush(new User(email, passwordEncoder.encode("Sup3rSecret!"), "Test", role));
    }

    private String bearer(User user) {
        return "Bearer " + tokenService.issueFor(user).value();
    }

    private Venue saveVenue(User owner) { // capacity 500
        return venues.saveAndFlush(new Venue(owner, "City Hall", "1 Main Road", "Agra",
                null, "India", "Asia/Kolkata", 500));
    }

    private void saveSeats(Venue venue, String section, String row, int count) {
        for (int n = 1; n <= count; n++) {
            seats.save(new Seat(venue, section, row, String.valueOf(n)));
        }
        seats.flush();
    }

    private String blockJson(String section, String rowsJson, int seatsPerRow) {
        return """
                {"section":"%s","rows":%s,"seatsPerRow":%d}
                """.formatted(section, rowsJson, seatsPerRow);
    }

    private ResultActions postBlock(User actor, long venueId, String json) throws Exception {
        return mockMvc.perform(post("/api/organizer/venues/{id}/seat-blocks", venueId)
                .header("Authorization", bearer(actor))
                .contentType(MediaType.APPLICATION_JSON).content(json));
    }

    private String rowLabels(String prefix, int count) {
        return IntStream.rangeClosed(1, count)
                .mapToObj(i -> "\"" + prefix + i + "\"")
                .collect(Collectors.joining(",", "[", "]"));
    }

    @Test
    void organizerGeneratesASeatBlockWithUppercaseRowLabels() throws Exception {
        User organizer = saveUser(Role.ORGANIZER);
        Venue venue = saveVenue(organizer);

        postBlock(organizer, venue.getId(), blockJson("VIP", "[\"a\",\"b\",\"c\"]", 10))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.section").value("VIP"))
                .andExpect(jsonPath("$.rows[0]").value("A"))
                .andExpect(jsonPath("$.seatsCreated").value(30));

        assertThat(seats.countByVenueId(venue.getId())).isEqualTo(30);
    }

    @Test
    void seatsCannotExceedTheVenueCapacity() throws Exception {
        User organizer = saveUser(Role.ORGANIZER);
        Venue venue = saveVenue(organizer);

        postBlock(organizer, venue.getId(), blockJson("Main", rowLabels("R", 40), 10)) // 400 of 500
                .andExpect(status().isCreated());
        postBlock(organizer, venue.getId(), blockJson("Extra", rowLabels("R", 20), 10)) // +200 = 600
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail", containsString("capacity")));

        assertThat(seats.countByVenueId(venue.getId())).isEqualTo(400);
    }

    @Test
    void aRowCanOnlyBeGeneratedOncePerSection() throws Exception {
        User organizer = saveUser(Role.ORGANIZER);
        Venue venue = saveVenue(organizer);

        postBlock(organizer, venue.getId(), blockJson("VIP", "[\"A\"]", 10)).andExpect(status().isCreated());
        postBlock(organizer, venue.getId(), blockJson("VIP", "[\"A\",\"B\"]", 10))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail", containsString("A")));
        postBlock(organizer, venue.getId(), blockJson("Balcony", "[\"A\"]", 10)).andExpect(status().isCreated());

        assertThat(seats.countByVenueId(venue.getId())).isEqualTo(20); // the rejected request created nothing
    }

    @Test
    void invalidBlockRequestsGiveValidationErrors() throws Exception {
        User organizer = saveUser(Role.ORGANIZER);
        Venue venue = saveVenue(organizer);

        postBlock(organizer, venue.getId(), blockJson("VIP/Gold", "[]", 0))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.section").exists())
                .andExpect(jsonPath("$.errors.rows").exists())
                .andExpect(jsonPath("$.errors.seatsPerRow").exists());
    }

    @Test
    void duplicateRowLabelsInOneRequestAreRejected() throws Exception {
        User organizer = saveUser(Role.ORGANIZER);
        Venue venue = saveVenue(organizer);

        postBlock(organizer, venue.getId(), blockJson("VIP", "[\"A\",\"a\"]", 5))
                .andExpect(status().isBadRequest());
    }

    @Test
    void listingSectionsShowsSeatAndRowCounts() throws Exception {
        User organizer = saveUser(Role.ORGANIZER);
        Venue venue = saveVenue(organizer);
        postBlock(organizer, venue.getId(), blockJson("VIP", "[\"A\",\"B\"]", 10)).andExpect(status().isCreated());
        postBlock(organizer, venue.getId(), blockJson("Balcony", "[\"A\",\"B\",\"C\"]", 20)).andExpect(status().isCreated());

        mockMvc.perform(get("/api/organizer/venues/{id}/seat-sections", venue.getId())
                        .header("Authorization", bearer(organizer)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].section").value("Balcony"))
                .andExpect(jsonPath("$[0].seatCount").value(60))
                .andExpect(jsonPath("$[0].rowCount").value(3))
                .andExpect(jsonPath("$[1].section").value("VIP"))
                .andExpect(jsonPath("$[1].seatCount").value(20));
    }

    @Test
    void anotherOrganizerCannotSeeOrChangeAVenuesSeats() throws Exception {
        User owner = saveUser(Role.ORGANIZER);
        User intruder = saveUser(Role.ORGANIZER);
        Venue venue = saveVenue(owner);
        saveSeats(venue, "VIP", "A", 10);

        postBlock(intruder, venue.getId(), blockJson("Other", "[\"A\"]", 5)).andExpect(status().isNotFound());
        mockMvc.perform(get("/api/organizer/venues/{id}/seat-sections", venue.getId())
                        .header("Authorization", bearer(intruder)))
                .andExpect(status().isNotFound());
        mockMvc.perform(delete("/api/organizer/venues/{id}/seat-sections/VIP", venue.getId())
                        .header("Authorization", bearer(intruder)))
                .andExpect(status().isNotFound());

        assertThat(seats.countByVenueId(venue.getId())).isEqualTo(10);
    }

    @Test
    void deletingASectionRemovesOnlyItsSeats() throws Exception {
        User organizer = saveUser(Role.ORGANIZER);
        Venue venue = saveVenue(organizer);
        saveSeats(venue, "VIP", "A", 10);
        saveSeats(venue, "Balcony", "B", 10);

        mockMvc.perform(delete("/api/organizer/venues/{id}/seat-sections/VIP", venue.getId())
                        .header("Authorization", bearer(organizer)))
                .andExpect(status().isNoContent());

        assertThat(seats.countByVenueId(venue.getId())).isEqualTo(10);
        assertThat(seats.existsByVenueIdAndSection(venue.getId(), "VIP")).isFalse();
    }

    @Test
    void aSectionUsedByATicketTypeCannotBeDeleted() throws Exception {
        User organizer = saveUser(Role.ORGANIZER);
        Venue venue = saveVenue(organizer);
        saveSeats(venue, "VIP", "A", 10);
        Instant start = Instant.now().plus(30, ChronoUnit.DAYS);
        Event event = events.saveAndFlush(new Event(organizer, venue, "Concert", null, "MUSIC", null,
                start, start.plus(3, ChronoUnit.HOURS), SeatingMode.RESERVED_SEATING, "INR"));
        ticketTypes.saveAndFlush(TicketType.reservedSection(event, "VIP", new BigDecimal("2500.00"),
                "VIP", 4, null, null));

        mockMvc.perform(delete("/api/organizer/venues/{id}/seat-sections/VIP", venue.getId())
                        .header("Authorization", bearer(organizer)))
                .andExpect(status().isConflict());

        assertThat(seats.countByVenueId(venue.getId())).isEqualTo(10);
    }

    @Test
    void deletingAnUnknownSectionGives404() throws Exception {
        User organizer = saveUser(Role.ORGANIZER);
        Venue venue = saveVenue(organizer);

        mockMvc.perform(delete("/api/organizer/venues/{id}/seat-sections/Nope", venue.getId())
                        .header("Authorization", bearer(organizer)))
                .andExpect(status().isNotFound());
    }

    @Test
    void customersCannotManageSeats() throws Exception {
        User organizer = saveUser(Role.ORGANIZER);
        User customer = saveUser(Role.CUSTOMER);
        Venue venue = saveVenue(organizer);

        postBlock(customer, venue.getId(), blockJson("VIP", "[\"A\"]", 5)).andExpect(status().isForbidden());
    }
}