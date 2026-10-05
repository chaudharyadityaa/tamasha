package com.eventhub.booking;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.eventhub.TestcontainersConfiguration;
import com.eventhub.event.Event;
import com.eventhub.event.EventRepository;
import com.eventhub.event.SeatingMode;
import com.eventhub.event.TicketType;
import com.eventhub.event.TicketTypeRepository;
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
import java.time.temporal.ChronoUnit;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

@DataJpaTest
@Import(TestcontainersConfiguration.class)
@ActiveProfiles("test")
class BookingRepositoryTest {

    private final Instant start = Instant.now().plus(30, ChronoUnit.DAYS);

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
    private JdbcTemplate jdbc;
    @Autowired
    private EntityManager em;

    private User saveUser(Role role) {
        String email = role.name().toLowerCase() + "-" + UUID.randomUUID() + "@example.com";
        return users.saveAndFlush(new User(email, "hash", "Test", role));
    }

    private Venue saveVenue(User owner) {
        return venues.saveAndFlush(new Venue(owner, "City Hall", "1 Main Road", "Agra",
                null, "India", "Asia/Kolkata", 500));
    }

    private Event saveEvent(User organizer, Venue venue, SeatingMode mode) {
        return events.saveAndFlush(new Event(organizer, venue, "Concert", null, "MUSIC", null,
                start, start.plus(3, ChronoUnit.HOURS), mode, "INR"));
    }

    private TicketType saveVipType(Event event) {
        return ticketTypes.saveAndFlush(TicketType.reservedSection(event, "VIP",
                new BigDecimal("2500.50"), "VIP", 4, null, null));
    }

    private Seat saveSeat(Venue venue, String number) {
        return seats.saveAndFlush(new Seat(venue, "VIP", "A", number));
    }

    private Booking newBooking(User customer, Event event) {
        return new Booking(customer, event, BookingReference.generate(), Instant.now().plus(15, ChronoUnit.MINUTES));
    }

    @Test
    void bookingWithSeatAndItemLinesIsSavedAndReloadedWithExactMoney() {
        User organizer = saveUser(Role.ORGANIZER);
        User customer = saveUser(Role.CUSTOMER);
        Venue venue = saveVenue(organizer);
        Event event = saveEvent(organizer, venue, SeatingMode.RESERVED_SEATING);
        TicketType vip = saveVipType(event);
        TicketType standing = ticketTypes.saveAndFlush(TicketType.generalAdmission(event, "Standing",
                new BigDecimal("100.00"), 50, 4, null, null));
        Booking booking = newBooking(customer, event);
        booking.addSeat(saveSeat(venue, "1"), vip);
        booking.addItem(standing, 3);

        Booking saved = bookings.saveAndFlush(booking);
        em.clear(); // forget cached objects so the next read really hits the database

        Booking reloaded = bookings.findById(saved.getId()).orElseThrow();
        assertThat(reloaded.getTotalAmount()).isEqualByComparingTo("2800.50"); // 2500.50 + 3 x 100.00
        assertThat(reloaded.getSeats()).hasSize(1);
        assertThat(reloaded.getItems()).hasSize(1);
        assertThat(reloaded.getCurrency()).isEqualTo("INR");
        assertThat(bookings.findByReference(booking.getReference())).isPresent();
    }

    @Test
    void databaseRefusesTheSameActiveSeatForTwoBookingsOfOneEvent() {
        User organizer = saveUser(Role.ORGANIZER);
        Venue venue = saveVenue(organizer);
        Event event = saveEvent(organizer, venue, SeatingMode.RESERVED_SEATING);
        TicketType vip = saveVipType(event);
        Seat seat = saveSeat(venue, "1");

        Booking first = newBooking(saveUser(Role.CUSTOMER), event);
        first.addSeat(seat, vip);
        bookings.saveAndFlush(first);

        Booking second = newBooking(saveUser(Role.CUSTOMER), event);
        second.addSeat(seat, vip);

        assertThatThrownBy(() -> bookings.saveAndFlush(second))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void aReleasedSeatCanBeBookedAgain() {
        User organizer = saveUser(Role.ORGANIZER);
        Venue venue = saveVenue(organizer);
        Event event = saveEvent(organizer, venue, SeatingMode.RESERVED_SEATING);
        TicketType vip = saveVipType(event);
        Seat seat = saveSeat(venue, "1");

        Booking first = newBooking(saveUser(Role.CUSTOMER), event);
        first.addSeat(seat, vip);
        bookings.saveAndFlush(first);
        first.cancel(Instant.now()); // releases the seat
        bookings.saveAndFlush(first);

        Booking second = newBooking(saveUser(Role.CUSTOMER), event);
        second.addSeat(seat, vip);
        bookings.saveAndFlush(second);

        assertThat(bookingSeats.countByEventIdAndReleasedAtIsNull(event.getId())).isEqualTo(1);
    }

    @Test
    void theSameSeatCanBeHeldForDifferentEvents() {
        User organizer = saveUser(Role.ORGANIZER);
        Venue venue = saveVenue(organizer);
        Seat seat = saveSeat(venue, "1");
        Event eventA = saveEvent(organizer, venue, SeatingMode.RESERVED_SEATING);
        Event eventB = saveEvent(organizer, venue, SeatingMode.RESERVED_SEATING);

        Booking forA = newBooking(saveUser(Role.CUSTOMER), eventA);
        forA.addSeat(seat, saveVipType(eventA));
        Booking forB = newBooking(saveUser(Role.CUSTOMER), eventB);
        forB.addSeat(seat, saveVipType(eventB));

        bookings.saveAndFlush(forA);
        bookings.saveAndFlush(forB);

        assertThat(bookingSeats.countByEventIdAndReleasedAtIsNull(eventA.getId())).isEqualTo(1);
        assertThat(bookingSeats.countByEventIdAndReleasedAtIsNull(eventB.getId())).isEqualTo(1);
    }

    @Test
    void aSeatLineCannotPointAtADifferentEventThanItsBooking() {
        User organizer = saveUser(Role.ORGANIZER);
        Venue venue = saveVenue(organizer);
        Event eventA = saveEvent(organizer, venue, SeatingMode.RESERVED_SEATING);
        Event eventB = saveEvent(organizer, venue, SeatingMode.RESERVED_SEATING);
        TicketType vip = saveVipType(eventA);
        Seat seat = saveSeat(venue, "1");
        Booking booking = bookings.saveAndFlush(newBooking(saveUser(Role.CUSTOMER), eventA));

        assertThatThrownBy(() -> jdbc.update(
                "INSERT INTO booking_seats (booking_id, event_id, seat_id, ticket_type_id, unit_price) "
                        + "VALUES (?, ?, ?, ?, 10.00)",
                booking.getId(), eventB.getId(), seat.getId(), vip.getId()))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void bookingReferencesMustBeUnique() {
        User organizer = saveUser(Role.ORGANIZER);
        Event event = saveEvent(organizer, saveVenue(organizer), SeatingMode.GENERAL_ADMISSION);
        Instant expires = Instant.now().plus(15, ChronoUnit.MINUTES);
        bookings.saveAndFlush(new Booking(saveUser(Role.CUSTOMER), event, "EH-DUPLICATE1", expires));

        assertThatThrownBy(() -> bookings.saveAndFlush(
                new Booking(saveUser(Role.CUSTOMER), event, "EH-DUPLICATE1", expires)))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void anIdempotencyKeyCanBeUsedOncePerCustomerOnly() {
        User organizer = saveUser(Role.ORGANIZER);
        Event event = saveEvent(organizer, saveVenue(organizer), SeatingMode.GENERAL_ADMISSION);
        User ana = saveUser(Role.CUSTOMER);
        User ben = saveUser(Role.CUSTOMER);

        Booking first = newBooking(ana, event);
        first.setIdempotencyKey("key-1");
        bookings.saveAndFlush(first);

        Booking otherCustomer = newBooking(ben, event);
        otherCustomer.setIdempotencyKey("key-1");
        bookings.saveAndFlush(otherCustomer); // a different customer may reuse the same key text

        Booking repeat = newBooking(ana, event);
        repeat.setIdempotencyKey("key-1");
        assertThatThrownBy(() -> bookings.saveAndFlush(repeat))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void databaseRejectsAnUnknownBookingStatus() {
        User organizer = saveUser(Role.ORGANIZER);
        Event event = saveEvent(organizer, saveVenue(organizer), SeatingMode.GENERAL_ADMISSION);
        Booking booking = bookings.saveAndFlush(newBooking(saveUser(Role.CUSTOMER), event));

        assertThatThrownBy(() -> jdbc.update("UPDATE bookings SET status = 'PAID' WHERE id = ?", booking.getId()))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void databaseRejectsABookingItemWithZeroQuantity() {
        User organizer = saveUser(Role.ORGANIZER);
        Event event = saveEvent(organizer, saveVenue(organizer), SeatingMode.GENERAL_ADMISSION);
        TicketType standing = ticketTypes.saveAndFlush(TicketType.generalAdmission(event, "Standing",
                new BigDecimal("100.00"), 50, 4, null, null));
        Booking booking = bookings.saveAndFlush(newBooking(saveUser(Role.CUSTOMER), event));

        assertThatThrownBy(() -> jdbc.update(
                "INSERT INTO booking_items (booking_id, ticket_type_id, quantity, unit_price) VALUES (?, ?, 0, 100.00)",
                booking.getId(), standing.getId()))
                .isInstanceOf(DataIntegrityViolationException.class);
    }
}