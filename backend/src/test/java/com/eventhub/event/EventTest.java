package com.eventhub.event;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.eventhub.user.Role;
import com.eventhub.user.User;
import com.eventhub.venue.Venue;
import java.time.Instant;
import org.junit.jupiter.api.Test;

class EventTest {

    private static final Instant START = Instant.parse("2027-01-10T13:30:00Z");
    private static final Instant END = Instant.parse("2027-01-10T16:30:00Z");

    private Event newEvent() {
        User organizer = new User("org@example.com", "hash", "Organizer", Role.ORGANIZER);
        Venue venue = new Venue(organizer, "City Hall", "1 Main Road", "Agra", null,
                "India", "Asia/Kolkata", 500);
        return new Event(organizer, venue, "Concert", "A concert", "MUSIC", null,
                START, END, SeatingMode.GENERAL_ADMISSION, "inr");
    }

    @Test
    void newEventStartsAsDraft() {
        assertThat(newEvent().getStatus()).isEqualTo(EventStatus.DRAFT);
    }

    @Test
    void currencyIsNormalizedToUpperCase() {
        assertThat(newEvent().getCurrency()).isEqualTo("INR");
    }

    @Test
    void eventEndingBeforeItStartsIsRejected() {
        User organizer = new User("org@example.com", "hash", "Organizer", Role.ORGANIZER);
        Venue venue = new Venue(organizer, "City Hall", "1 Main Road", "Agra", null,
                "India", "Asia/Kolkata", 500);
        assertThatThrownBy(() -> new Event(organizer, venue, "Concert", null, "MUSIC", null,
                END, START, SeatingMode.GENERAL_ADMISSION, "INR"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void draftCanBePublishedAndThenUnpublished() {
        Event event = newEvent();
        event.publish();
        assertThat(event.getStatus()).isEqualTo(EventStatus.PUBLISHED);
        event.unpublish();
        assertThat(event.getStatus()).isEqualTo(EventStatus.DRAFT);
    }

    @Test
    void publishedEventCannotBePublishedAgain() {
        Event event = newEvent();
        event.publish();
        assertThatThrownBy(event::publish).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void cancelledEventCannotBePublishedOrCancelledAgain() {
        Event event = newEvent();
        event.cancel();
        assertThat(event.getStatus()).isEqualTo(EventStatus.CANCELLED);
        assertThatThrownBy(event::publish).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(event::cancel).isInstanceOf(IllegalStateException.class);
    }
}