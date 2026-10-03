package com.eventhub.event;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.eventhub.TestcontainersConfiguration;
import com.eventhub.user.Role;
import com.eventhub.user.User;
import com.eventhub.user.UserRepository;
import com.eventhub.venue.Seat;
import com.eventhub.venue.SeatRepository;
import com.eventhub.venue.Venue;
import com.eventhub.venue.VenueRepository;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

@DataJpaTest
@Import(TestcontainersConfiguration.class)
@ActiveProfiles("test")
class CatalogRepositoryTest {

    private static final Instant START = Instant.parse("2027-01-10T13:30:00Z");
    private static final Instant END = Instant.parse("2027-01-10T16:30:00Z");

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
    private JdbcTemplate jdbc;
    @Autowired
    private EntityManager em;

    private User newOrganizer() {
        return users.saveAndFlush(new User("org@example.com", "hash", "Organizer", Role.ORGANIZER));
    }

    private Venue newVenue(User owner) {
        return venues.saveAndFlush(new Venue(owner, "City Hall", "1 Main Road", "Agra",
                null, "India", "Asia/Kolkata", 500));
    }

    private Event newEvent(User organizer, Venue venue, String title) {
        return events.saveAndFlush(new Event(organizer, venue, title, null, "MUSIC", null,
                START, END, SeatingMode.GENERAL_ADMISSION, "INR"));
    }

    @Test
    void findByStatusReturnsOnlyEventsWithThatStatus() {
        User organizer = newOrganizer();
        Venue venue = newVenue(organizer);
        newEvent(organizer, venue, "Draft show");
        Event live = newEvent(organizer, venue, "Live show");
        live.publish();
        events.saveAndFlush(live);

        Page<Event> page = events.findByStatus(EventStatus.PUBLISHED, PageRequest.of(0, 10));

        assertThat(page.getContent()).extracting(Event::getTitle).containsExactly("Live show");
    }

    @Test
    void ticketPriceSurvivesASaveAndReloadWithoutRoundingErrors() {
        User organizer = newOrganizer();
        Event event = newEvent(organizer, newVenue(organizer), "Concert");
        TicketType saved = ticketTypes.saveAndFlush(TicketType.generalAdmission(
                event, "Standing", new BigDecimal("499.50"), 200, 6, null, null));
        em.clear(); // forget cached objects so the next read really hits the database

        TicketType reloaded = ticketTypes.findById(saved.getId()).orElseThrow();

        assertThat(reloaded.getPrice()).isEqualByComparingTo("499.50");
        assertThat(reloaded.getQuantityTotal()).isEqualTo(200);
        assertThat(reloaded.getSeatSection()).isNull();
    }

    @Test
    void databaseRefusesToSellMoreTicketsThanExist() {
        User organizer = newOrganizer();
        Event event = newEvent(organizer, newVenue(organizer), "Concert");
        TicketType saved = ticketTypes.saveAndFlush(TicketType.generalAdmission(
                event, "Standing", new BigDecimal("100.00"), 10, 4, null, null));

        assertThatThrownBy(() -> jdbc.update(
                "UPDATE ticket_types SET quantity_sold = 11 WHERE id = ?", saved.getId()))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void databaseRefusesATicketTypeThatHasBothQuantityAndSection() {
        User organizer = newOrganizer();
        Event event = newEvent(organizer, newVenue(organizer), "Concert");

        assertThatThrownBy(() -> jdbc.update(
                "INSERT INTO ticket_types (event_id, name, price, quantity_total, seat_section) "
                        + "VALUES (?, 'Bad', 10.00, 5, 'VIP')", event.getId()))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void sameSeatPositionCannotExistTwiceInOneVenue() {
        User organizer = newOrganizer();
        Venue venue = newVenue(organizer);
        seats.saveAndFlush(new Seat(venue, "A", "1", "1"));

        assertThatThrownBy(() -> seats.saveAndFlush(new Seat(venue, "A", "1", "1")))
                .isInstanceOf(DataIntegrityViolationException.class);
    }
}