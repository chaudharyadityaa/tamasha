package com.eventhub.booking;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.eventhub.event.Event;
import com.eventhub.event.SeatingMode;
import com.eventhub.event.TicketType;
import com.eventhub.user.Role;
import com.eventhub.user.User;
import com.eventhub.venue.Seat;
import com.eventhub.venue.Venue;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import org.junit.jupiter.api.Test;

class BookingTest {

    private final Instant now = Instant.now();
    private final User customer = new User("cust@example.com", "hash", "Customer", Role.CUSTOMER);
    private final User organizer = new User("org@example.com", "hash", "Organizer", Role.ORGANIZER);
    private final Venue venue = new Venue(organizer, "City Hall", "1 Main Road", "Agra", null,
            "India", "Asia/Kolkata", 500);
    private final Event event = new Event(organizer, venue, "Concert", null, "MUSIC", null,
            now.plus(30, ChronoUnit.DAYS), now.plus(30, ChronoUnit.DAYS).plus(3, ChronoUnit.HOURS),
            SeatingMode.RESERVED_SEATING, "INR");
    private final TicketType standing = TicketType.generalAdmission(event, "Standing",
            new BigDecimal("100.00"), 100, 4, null, null);
    private final TicketType vip = TicketType.reservedSection(event, "VIP",
            new BigDecimal("250.50"), "VIP", 4, null, null);
    private final Seat seat = new Seat(venue, "VIP", "A", "1");

    private Booking newBooking() {
        return new Booking(customer, event, "EH-TEST000001", now.plus(15, ChronoUnit.MINUTES));
    }

    @Test
    void newBookingIsPendingWithAZeroTotalInTheEventCurrency() {
        Booking booking = newBooking();

        assertThat(booking.getStatus()).isEqualTo(BookingStatus.PENDING_PAYMENT);
        assertThat(booking.getTotalAmount()).isEqualByComparingTo("0.00");
        assertThat(booking.getCurrency()).isEqualTo("INR");
    }

    @Test
    void totalIsTheSumOfLinesPricedAtBookingTime() {
        Booking booking = newBooking();
        booking.addItem(standing, 2);
        booking.addSeat(seat, vip);

        assertThat(booking.getTotalAmount()).isEqualByComparingTo("450.50"); // 2 x 100.00 + 250.50
        assertThat(booking.getItems().get(0).getUnitPrice()).isEqualByComparingTo("100.00");
        assertThat(booking.getSeats().get(0).getUnitPrice()).isEqualByComparingTo("250.50");
    }

    @Test
    void pendingBookingCanBeConfirmedBeforeTheHoldExpires() {
        Booking booking = newBooking();

        booking.confirm(now);

        assertThat(booking.getStatus()).isEqualTo(BookingStatus.CONFIRMED);
        assertThat(booking.getConfirmedAt()).isEqualTo(now);
    }

    @Test
    void confirmingAnExpiredHoldIsRefused() {
        Booking booking = newBooking();

        assertThatThrownBy(() -> booking.confirm(booking.getExpiresAt().plusSeconds(1)))
                .isInstanceOf(IllegalStateException.class);
        assertThat(booking.getStatus()).isEqualTo(BookingStatus.PENDING_PAYMENT);
    }

    @Test
    void cancellingAConfirmedBookingReleasesItsSeats() {
        Booking booking = newBooking();
        booking.addSeat(seat, vip);
        booking.confirm(now);

        booking.cancel(now.plusSeconds(60));

        assertThat(booking.getStatus()).isEqualTo(BookingStatus.CANCELLED);
        assertThat(booking.getCancelledAt()).isEqualTo(now.plusSeconds(60));
        assertThat(booking.getSeats().get(0).isActive()).isFalse();
    }

    @Test
    void cancelledAndExpiredBookingsAreFinal() {
        Booking cancelled = newBooking();
        cancelled.cancel(now);
        assertThatThrownBy(() -> cancelled.confirm(now)).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> cancelled.cancel(now)).isInstanceOf(IllegalStateException.class);

        Booking expired = newBooking();
        expired.expire(expired.getExpiresAt().plusSeconds(1));
        assertThatThrownBy(() -> expired.confirm(now)).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> expired.cancel(now)).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void aHoldCanOnlyExpireAfterItsDeadlineAndThenReleasesSeats() {
        Booking booking = newBooking();
        booking.addSeat(seat, vip);

        assertThatThrownBy(() -> booking.expire(now)).isInstanceOf(IllegalStateException.class);
        assertThat(booking.getSeats().get(0).isActive()).isTrue();

        booking.expire(booking.getExpiresAt());

        assertThat(booking.getStatus()).isEqualTo(BookingStatus.EXPIRED);
        assertThat(booking.getSeats().get(0).isActive()).isFalse();
    }

    @Test
    void linesCannotBeAddedOnceTheBookingIsNoLongerPending() {
        Booking booking = newBooking();
        booking.confirm(now);

        assertThatThrownBy(() -> booking.addItem(standing, 1)).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> booking.addSeat(seat, vip)).isInstanceOf(IllegalStateException.class);
    }
}