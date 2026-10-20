package com.eventhub.security;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.HashMap;
import java.util.Map;

/**
 * A sliding window counter: at most maxAttempts recorded events per key inside the window.
 * Time is passed in, so the logic can be tested without waiting.
 */
final class AttemptWindow {

    private static final int EVICTION_THRESHOLD = 10_000;

    private final int maxAttempts;
    private final Duration window;
    private final Map<String, Deque<Instant>> hits = new HashMap<>();

    AttemptWindow(int maxAttempts, Duration window) {
        this.maxAttempts = maxAttempts;
        this.window = window;
    }

    /** 0 if the key may proceed; otherwise how many seconds until its oldest hit leaves the window. */
    synchronized long retryAfterSeconds(String key, Instant now) {
        Deque<Instant> times = hits.get(key);
        if (times == null) {
            return 0;
        }
        purge(times, now);
        if (times.isEmpty()) {
            hits.remove(key);
            return 0;
        }
        if (times.size() < maxAttempts) {
            return 0;
        }
        long millis = Duration.between(now, times.peekFirst().plus(window)).toMillis();
        return Math.max(1, (millis + 999) / 1000);
    }

    synchronized void record(String key, Instant now) {
        if (hits.size() >= EVICTION_THRESHOLD) {
            evictExpired(now); // keeps memory bounded when many different keys show up
        }
        Deque<Instant> times = hits.computeIfAbsent(key, k -> new ArrayDeque<>());
        purge(times, now);
        times.addLast(now);
    }

    synchronized void clear(String key) {
        hits.remove(key);
    }

    private void purge(Deque<Instant> times, Instant now) {
        while (!times.isEmpty() && !times.peekFirst().plus(window).isAfter(now)) {
            times.removeFirst();
        }
    }

    private void evictExpired(Instant now) {
        hits.values().removeIf(times -> {
            purge(times, now);
            return times.isEmpty();
        });
    }
}