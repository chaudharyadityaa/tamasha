package com.eventhub.booking;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.eventhub.TestcontainersConfiguration;
import com.eventhub.event.Event;
import com.eventhub.event.SeatingMode;
import com.eventhub.event.TicketType;
import com.eventhub.event.TicketTypeRepository;
import com.eventhub.testsupport.TestFixtures;
import com.eventhub.user.Role;
import com.eventhub.user.User;
import com.eventhub.venue.Seat;
import com.eventhub.venue.Venue;
import com.jayway.jsonpath.JsonPath;
import jakarta.persistence.EntityManager;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@ActiveProfiles("test")
@Transactional
class BookingExpiryServiceTest {

    private final Instant now = Instant.now();

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private TestFixtures fx;
    @Autowired
    private BookingExpiryService expiryService;
    @Autowired
    private BookingRepository bookings;
    @Autowired
    private TicketTypeRepository ticketTypes;
    @Autowired
    private JdbcTemplate jdbc;
    @Autowired
    private EntityManager em;

    private long createGaBooking(User user, Event event, TicketType type, int quantity) throws Exception {
        String json = """
                {"eventId":%d,"items":[{"ticketTypeId":%d,"quantity":%d}]}
                """.formatted(event.getId(), type.getId(), quantity);
        String body = mockMvc.perform(post("/api/bookings").header("Authorization", fx.bearer(user))
                        .contentType(MediaType.APPLICATION_JSON).content(json))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return ((Number) JsonPath.read(body, "$.id")).longValue();
    }

    private void makeOverdue(long bookingId) {
        em.flush();
        jdbc.update("UPDATE bookings SET expires_at = now() - interval '5 minutes' WHERE id = ?", bookingId);
        em.clear();
    }

    @Test
    void sweeperExpiresOverdueHoldsReleasesTicketsAndLeavesEverythingElseAlone() throws Exception {
        User organizer = fx.user(Role.ORGANIZER);
        Event event = fx.draft(organizer, fx.venue(organizer), SeatingMode.GENERAL_ADMISSION,
                now.plus(10, ChronoUnit.DAYS));
        TicketType type = fx.gaType(event, "Standing", "100.00", 100, 4);
        fx.publish(event);
        User customer = fx.user(Role.CUSTOMER);

        long overdue = createGaBooking(customer, event, type, 3);
        long stillValid = createGaBooking(customer, event, type, 2);
        long paid = createGaBooking(customer, event, type, 1);
        mockMvc.perform(post("/api/bookings/" + paid + "/demo-payment").header("Authorization", fx.bearer(customer)))
                .andExpect(status().isOk());
        makeOverdue(overdue);
        makeOverdue(paid); // an old deadline must not matter once the booking is paid

        int expired = expiryService.expireBatch(Instant.now(), 50);

        assertThat(expired).isEqualTo(1);
        em.flush(); // write the EXPIRED status to the database before forgetting cached objects
        em.clear();
        assertThat(bookings.findById(overdue).orElseThrow().getStatus()).isEqualTo(BookingStatus.EXPIRED);
        assertThat(bookings.findById(stillValid).orElseThrow().getStatus()).isEqualTo(BookingStatus.PENDING_PAYMENT);
        assertThat(bookings.findById(paid).orElseThrow().getStatus()).isEqualTo(BookingStatus.CONFIRMED);
        // 3 + 2 + 1 were held; the 3 from the expired booking came back.
        assertThat(ticketTypes.findById(type.getId()).orElseThrow().getQuantitySold()).isEqualTo(3);
    }

    @Test
    void sweeperProcessesOverdueBookingsInBatches() throws Exception {
        User organizer = fx.user(Role.ORGANIZER);
        Venue venue = fx.venue(organizer);
        Event event = fx.draft(organizer, venue, SeatingMode.RESERVED_SEATING, now.plus(10, ChronoUnit.DAYS));
        TicketType vip = fx.sectionType(event, "VIP", "2500.00", "VIP");
        fx.publish(event);
        for (int i = 1; i <= 3; i++) {
            Seat seat = fx.seat(venue, "VIP", "A", String.valueOf(i));
            Booking stale = new Booking(fx.user(Role.CUSTOMER), event, BookingReference.generate(),
                    now.minus(1, ChronoUnit.MINUTES));
            stale.addSeat(seat, vip);
            bookings.saveAndFlush(stale);
        }

        assertThat(expiryService.expireBatch(Instant.now(), 2)).isEqualTo(2);
        assertThat(expiryService.expireBatch(Instant.now(), 2)).isEqualTo(1);
        assertThat(expiryService.expireBatch(Instant.now(), 2)).isZero();
    }

    @Test
    void aBookingThatTheSweeperAlreadyExpiredCannotBePaid() throws Exception {
        User organizer = fx.user(Role.ORGANIZER);
        Event event = fx.draft(organizer, fx.venue(organizer), SeatingMode.GENERAL_ADMISSION,
                now.plus(10, ChronoUnit.DAYS));
        TicketType type = fx.gaType(event, "Standing", "100.00", 100, 4);
        fx.publish(event);
        User customer = fx.user(Role.CUSTOMER);
        long bookingId = createGaBooking(customer, event, type, 1);
        makeOverdue(bookingId);
        expiryService.expireBatch(Instant.now(), 50);

        mockMvc.perform(post("/api/bookings/" + bookingId + "/demo-payment")
                        .header("Authorization", fx.bearer(customer)))
                .andExpect(status().isConflict());
    }
}