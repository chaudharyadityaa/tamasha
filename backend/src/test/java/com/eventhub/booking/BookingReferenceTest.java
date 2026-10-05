package com.eventhub.booking;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.HashSet;
import java.util.Set;
import org.junit.jupiter.api.Test;

class BookingReferenceTest {

    @Test
    void referencesHaveTheExpectedFormatWithoutLookAlikeCharacters() {
        for (int i = 0; i < 200; i++) {
            assertThat(BookingReference.generate()).matches("^EH-[0-9A-HJKMNP-TV-Z]{10}$");
        }
    }

    @Test
    void referencesDoNotRepeat() {
        Set<String> seen = new HashSet<>();
        for (int i = 0; i < 5000; i++) {
            seen.add(BookingReference.generate());
        }
        assertThat(seen).hasSize(5000);
    }
}