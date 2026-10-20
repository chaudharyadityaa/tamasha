package com.eventhub.security;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import java.time.Instant;
import org.junit.jupiter.api.Test;

class AttemptWindowTest {

    private final Instant t0 = Instant.parse("2027-01-01T10:00:00Z");

    @Test
    void allowsUpToTheLimitThenBlocksAndSaysHowLongToWait() {
        AttemptWindow window = new AttemptWindow(3, Duration.ofMinutes(10));
        for (int i = 0; i < 3; i++) {
            assertThat(window.retryAfterSeconds("k", t0)).isZero();
            window.record("k", t0);
        }

        // The oldest hit leaves the window after 10 minutes; one minute has passed, so 9 minutes remain.
        assertThat(window.retryAfterSeconds("k", t0.plusSeconds(60))).isEqualTo(540);
    }

    @Test
    void theBlockLiftsOnceTheWindowHasPassed() {
        AttemptWindow window = new AttemptWindow(3, Duration.ofMinutes(10));
        for (int i = 0; i < 3; i++) {
            window.record("k", t0);
        }

        assertThat(window.retryAfterSeconds("k", t0.plus(Duration.ofMinutes(10)))).isZero();
    }

    @Test
    void oldHitsDropOutOneAtATime() {
        AttemptWindow window = new AttemptWindow(3, Duration.ofMinutes(10));
        window.record("k", t0);
        window.record("k", t0.plus(Duration.ofMinutes(4)));
        window.record("k", t0.plus(Duration.ofMinutes(8)));

        assertThat(window.retryAfterSeconds("k", t0.plus(Duration.ofMinutes(9)))).isPositive();
        // At minute 10 the first hit expires, leaving two: below the limit again.
        assertThat(window.retryAfterSeconds("k", t0.plus(Duration.ofMinutes(10)))).isZero();
    }

    @Test
    void keysAreIndependentAndClearResetsOnlyOne() {
        AttemptWindow window = new AttemptWindow(1, Duration.ofMinutes(10));
        window.record("a", t0);
        window.record("b", t0);

        assertThat(window.retryAfterSeconds("a", t0)).isPositive();
        assertThat(window.retryAfterSeconds("b", t0)).isPositive();
        window.clear("a");
        assertThat(window.retryAfterSeconds("a", t0)).isZero();
        assertThat(window.retryAfterSeconds("b", t0)).isPositive();
        assertThat(window.retryAfterSeconds("never-seen", t0)).isZero();
    }
}