package com.eventhub.booking;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.HashSet;
import java.util.Set;
import org.junit.jupiter.api.Test;

class TicketCodeTest {

    @Test
    void codesHaveTheExpectedFormatWithoutLookAlikeCharacters() {
        for (int i = 0; i < 200; i++) {
            assertThat(TicketCode.generate()).matches("^TK-[0-9A-HJKMNP-TV-Z]{20}$");
        }
    }

    @Test
    void codesDoNotRepeat() {
        Set<String> seen = new HashSet<>();
        for (int i = 0; i < 5000; i++) {
            seen.add(TicketCode.generate());
        }
        assertThat(seen).hasSize(5000);
    }
}