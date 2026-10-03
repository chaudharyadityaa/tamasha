package com.eventhub.event;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.eventhub.user.Role;
import com.eventhub.user.User;
import com.eventhub.venue.Venue;
import java.math.BigDecimal;
import java.time.Instant;
import org.junit.jupiter.api.Test;

class TicketTypeTest {

    private Event newEvent() {
        User organizer = new User("org@example.com", "hash", "Organizer", Role.ORGANIZER);
        Venue venue = new Venue(organizer, "City Hall", "1 Main Road", "Agra", null,
                "India", "Asia/Kolkata", 500);
        return new Event(organizer, venue, "Concert", null, "MUSIC", null,
                Instant.parse("2027-01-10T13:30:00Z"), Instant.parse("2027-01-10T16:30:00Z"),
                SeatingMode.GENERAL_ADMISSION, "INR");
    }

    @Test
    void generalAdmissionHasQuantityAndNoSection() {
        TicketType type = TicketType.generalAdmission(newEvent(), "Standing",
                new BigDecimal("499.00"), 200, 6, null, null);
        assertThat(type.getQuantityTotal()).isEqualTo(200);
        assertThat(type.getSeatSection()).isNull();
        assertThat(type.getQuantitySold()).isZero();
    }

    @Test
    void reservedSectionHasSectionAndNoQuantity() {
        TicketType type = TicketType.reservedSection(newEvent(), "VIP",
                new BigDecimal("2500.00"), "VIP", 4, null, null);
        assertThat(type.getSeatSection()).isEqualTo("VIP");
        assertThat(type.getQuantityTotal()).isNull();
    }

    @Test
    void negativePriceIsRejected() {
        assertThatThrownBy(() -> TicketType.generalAdmission(newEvent(), "Standing",
                new BigDecimal("-1.00"), 10, 4, null, null))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void priceWithMoreThanTwoDecimalPlacesIsRejected() {
        assertThatThrownBy(() -> TicketType.generalAdmission(newEvent(), "Standing",
                new BigDecimal("10.505"), 10, 4, null, null))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void maxPerBookingOutsideAllowedRangeIsRejected() {
        assertThatThrownBy(() -> TicketType.generalAdmission(newEvent(), "Standing",
                new BigDecimal("10.00"), 10, 21, null, null))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void salesWindowMustEndAfterItStarts() {
        Instant start = Instant.parse("2026-12-01T00:00:00Z");
        Instant end = Instant.parse("2026-11-01T00:00:00Z");
        assertThatThrownBy(() -> TicketType.generalAdmission(newEvent(), "Standing",
                new BigDecimal("10.00"), 10, 4, start, end))
                .isInstanceOf(IllegalArgumentException.class);
    }
}