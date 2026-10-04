package com.eventhub.seating;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.containsInAnyOrder;
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
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@ActiveProfiles("test")
@Transactional
class SeatMapControllerTest {

    private final Instant start = Instant.now().plus(30, ChronoUnit.DAYS);

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

    private Venue saveVenue(User owner) {
        return venues.saveAndFlush(new Venue(owner, "City Hall", "1 Main Road", "Agra",
                null, "India", "Asia/Kolkata", 500));
    }

    private void saveSeat(Venue venue, String section, String row, String number) {
        seats.saveAndFlush(new Seat(venue, section, row, number));
    }

    private Event draftEvent(User organizer, Venue venue, SeatingMode mode) {
        return events.saveAndFlush(new Event(organizer, venue, "Concert", null, "MUSIC", null,
                start, start.plus(3, ChronoUnit.HOURS), mode, "INR"));
    }

    private void addSection(Event event, String name, String price, String section) {
        ticketTypes.saveAndFlush(TicketType.reservedSection(event, name, new BigDecimal(price),
                section, 4, null, null));
    }

    private void publish(Event event, String startingPrice) {
        event.setStartingPrice(new BigDecimal(startingPrice));
        event.publish();
        events.saveAndFlush(event);
    }

    @Test
    void seatMapGroupsSeatsBySectionWithPricesAndHidesUnsoldSections() throws Exception {
        User organizer = saveOrganizer();
        Venue venue = saveVenue(organizer);
        for (String n : new String[] {"1", "2", "3"}) {
            saveSeat(venue, "VIP", "A", n);
        }
        saveSeat(venue, "Balcony", "B", "1");
        saveSeat(venue, "Balcony", "B", "2");
        saveSeat(venue, "Standing", "C", "1"); // no ticket type: not for sale
        Event event = draftEvent(organizer, venue, SeatingMode.RESERVED_SEATING);
        addSection(event, "VIP", "2500.00", "VIP");
        addSection(event, "Balcony", "800.00", "Balcony");
        publish(event, "800.00");

        mockMvc.perform(get("/api/events/{id}/seats", event.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.currency").value("INR"))
                .andExpect(jsonPath("$.sections[*].section", containsInAnyOrder("VIP", "Balcony")))
                .andExpect(jsonPath("$.sections[0].section").value("VIP"))
                .andExpect(jsonPath("$.sections[0].price").value(2500.0))
                .andExpect(jsonPath("$.sections[0].onSale").value(true))
                .andExpect(jsonPath("$.sections[0].seats.length()").value(3))
                .andExpect(jsonPath("$.sections[0].seats[0].status").value("AVAILABLE"))
                .andExpect(jsonPath("$.sections[1].seats.length()").value(2));
    }

    @Test
    void seatsAreOrderedNaturallyNotAlphabetically() throws Exception {
        User organizer = saveOrganizer();
        Venue venue = saveVenue(organizer);
        for (String row : new String[] {"AA", "B", "A"}) {          // deliberately saved out of order
            for (String number : new String[] {"10", "2", "1"}) {
                saveSeat(venue, "Main", row, number);
            }
        }
        Event event = draftEvent(organizer, venue, SeatingMode.RESERVED_SEATING);
        addSection(event, "Main", "100.00", "Main");
        publish(event, "100.00");

        mockMvc.perform(get("/api/events/{id}/seats", event.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sections[0].seats[*].row",
                        contains("A", "A", "A", "B", "B", "B", "AA", "AA", "AA")))
                .andExpect(jsonPath("$.sections[0].seats[*].number",
                        contains("1", "2", "10", "1", "2", "10", "1", "2", "10")));
    }

    @Test
    void generalAdmissionEventsHaveNoSeatMap() throws Exception {
        User organizer = saveOrganizer();
        Venue venue = saveVenue(organizer);
        Event event = draftEvent(organizer, venue, SeatingMode.GENERAL_ADMISSION);
        ticketTypes.saveAndFlush(TicketType.generalAdmission(event, "Standing", new BigDecimal("100.00"),
                50, 4, null, null));
        publish(event, "100.00");

        mockMvc.perform(get("/api/events/{id}/seats", event.getId())).andExpect(status().isBadRequest());
    }

    @Test
    void draftAndCancelledEventsHaveNoPublicSeatMap() throws Exception {
        User organizer = saveOrganizer();
        Venue venue = saveVenue(organizer);
        Event draft = draftEvent(organizer, venue, SeatingMode.RESERVED_SEATING);
        Event cancelled = draftEvent(organizer, venue, SeatingMode.RESERVED_SEATING);
        publish(cancelled, "100.00");
        cancelled.cancel();
        events.saveAndFlush(cancelled);

        mockMvc.perform(get("/api/events/{id}/seats", draft.getId())).andExpect(status().isNotFound());
        mockMvc.perform(get("/api/events/{id}/seats", cancelled.getId())).andExpect(status().isNotFound());
    }

    @Test
    void unknownEventGives404() throws Exception {
        mockMvc.perform(get("/api/events/{id}/seats", 999_999_999L)).andExpect(status().isNotFound());
    }

    @Test
    void reservedSeatingEventCanBePublishedOnceItsSectionHasSeats() throws Exception {
        User organizer = saveOrganizer();
        Venue venue = saveVenue(organizer);
        Event event = draftEvent(organizer, venue, SeatingMode.RESERVED_SEATING);
        addSection(event, "VIP", "2500.00", "VIP");
        String bearer = "Bearer " + tokenService.issueFor(organizer).value();

        mockMvc.perform(post("/api/organizer/events/{id}/publish", event.getId()).header("Authorization", bearer))
                .andExpect(status().isConflict()); // the venue has no VIP seats yet

        mockMvc.perform(post("/api/organizer/venues/{id}/seat-blocks", venue.getId())
                        .header("Authorization", bearer)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"section\":\"VIP\",\"rows\":[\"A\"],\"seatsPerRow\":5}"))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/organizer/events/{id}/publish", event.getId()).header("Authorization", bearer))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PUBLISHED"));

        mockMvc.perform(get("/api/events/{id}/seats", event.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sections[0].seats.length()").value(5));
    }
}