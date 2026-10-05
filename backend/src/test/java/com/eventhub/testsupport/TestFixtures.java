package com.eventhub.testsupport;

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
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/** Test-only shortcuts for creating users, venues, events and tickets. */
@Component
public class TestFixtures {

    private final UserRepository users;
    private final VenueRepository venues;
    private final SeatRepository seats;
    private final EventRepository events;
    private final TicketTypeRepository ticketTypes;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenService tokenService;

    public TestFixtures(UserRepository users, VenueRepository venues, SeatRepository seats,
                        EventRepository events, TicketTypeRepository ticketTypes,
                        PasswordEncoder passwordEncoder, JwtTokenService tokenService) {
        this.users = users;
        this.venues = venues;
        this.seats = seats;
        this.events = events;
        this.ticketTypes = ticketTypes;
        this.passwordEncoder = passwordEncoder;
        this.tokenService = tokenService;
    }

    public User user(Role role) {
        String email = role.name().toLowerCase(Locale.ROOT) + "-" + UUID.randomUUID() + "@example.com";
        return users.saveAndFlush(new User(email, passwordEncoder.encode("Sup3rSecret!"), "Test", role));
    }

    public String bearer(User user) {
        return "Bearer " + tokenService.issueFor(user).value();
    }

    public Venue venue(User owner) {
        return venues.saveAndFlush(new Venue(owner, "City Hall", "1 Main Road", "Agra",
                null, "India", "Asia/Kolkata", 500));
    }

    public Seat seat(Venue venue, String section, String row, String number) {
        return seats.saveAndFlush(new Seat(venue, section, row, number));
    }

    public Event draft(User organizer, Venue venue, SeatingMode mode, Instant start) {
        return events.saveAndFlush(new Event(organizer, venue, "Concert", null, "MUSIC", null,
                start, start.plus(3, ChronoUnit.HOURS), mode, "INR"));
    }

    public TicketType gaType(Event event, String name, String price, int quantity, int maxPerBooking) {
        return ticketTypes.saveAndFlush(TicketType.generalAdmission(event, name, new BigDecimal(price),
                quantity, maxPerBooking, null, null));
    }

    public TicketType sectionType(Event event, String name, String price, String section) {
        return ticketTypes.saveAndFlush(TicketType.reservedSection(event, name, new BigDecimal(price),
                section, 4, null, null));
    }

    public Event publish(Event event) {
        event.setStartingPrice(new BigDecimal("1.00"));
        event.publish();
        return events.saveAndFlush(event);
    }
}