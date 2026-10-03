package com.eventhub.venue;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.eventhub.TestcontainersConfiguration;
import com.eventhub.security.JwtTokenService;
import com.eventhub.user.Role;
import com.eventhub.user.User;
import com.eventhub.user.UserRepository;
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
class OrganizerVenueControllerTest {

    private static final String VALID_VENUE = """
            {"name":"City Hall","addressLine":"1 Main Road","city":"Agra",
             "country":"India","timeZone":"Asia/Kolkata","capacity":500}
            """;

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private UserRepository users;
    @Autowired
    private VenueRepository venues;
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

    private ResultActions postVenue(User actor, String json) throws Exception {
        return mockMvc.perform(post("/api/organizer/venues")
                .header("Authorization", bearer(actor))
                .contentType(MediaType.APPLICATION_JSON).content(json));
    }

    @Test
    void organizerCreatesAVenue() throws Exception {
        User organizer = saveUser(Role.ORGANIZER);

        postVenue(organizer, VALID_VENUE)
                .andExpect(status().isCreated())
                .andExpect(header().exists("Location"))
                .andExpect(jsonPath("$.id").isNotEmpty())
                .andExpect(jsonPath("$.name").value("City Hall"))
                .andExpect(jsonPath("$.timeZone").value("Asia/Kolkata"))
                .andExpect(jsonPath("$.capacity").value(500));
    }

    @Test
    void unknownTimeZoneIsRejected() throws Exception {
        User organizer = saveUser(Role.ORGANIZER);

        postVenue(organizer, VALID_VENUE.replace("Asia/Kolkata", "Mars/Olympus"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void invalidFieldsGiveValidationErrors() throws Exception {
        User organizer = saveUser(Role.ORGANIZER);

        postVenue(organizer, """
                {"name":"","addressLine":"1 Main Road","city":"Agra",
                 "country":"India","timeZone":"Asia/Kolkata","capacity":0}
                """)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.name").exists())
                .andExpect(jsonPath("$.errors.capacity").exists());
    }

    @Test
    void organizersOnlySeeTheirOwnVenues() throws Exception {
        User owner = saveUser(Role.ORGANIZER);
        User other = saveUser(Role.ORGANIZER);
        Venue venue = venues.saveAndFlush(new Venue(owner, "City Hall", "1 Main Road", "Agra",
                null, "India", "Asia/Kolkata", 500));

        mockMvc.perform(get("/api/organizer/venues").header("Authorization", bearer(owner)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1));

        mockMvc.perform(get("/api/organizer/venues").header("Authorization", bearer(other)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(0));

        mockMvc.perform(get("/api/organizer/venues/{id}", venue.getId()).header("Authorization", bearer(other)))
                .andExpect(status().isNotFound());

        mockMvc.perform(get("/api/organizer/venues/{id}", venue.getId()).header("Authorization", bearer(owner)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("City Hall"));
    }

    @Test
    void customersCannotCreateVenues() throws Exception {
        User customer = saveUser(Role.CUSTOMER);

        postVenue(customer, VALID_VENUE).andExpect(status().isForbidden());
    }
}