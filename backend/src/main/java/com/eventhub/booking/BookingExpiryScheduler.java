package com.eventhub.booking;

import java.time.Instant;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Runs the expiry service on a timer. Safe to run on several app instances at once. */
@Component
@ConditionalOnProperty(name = "app.booking.sweep-enabled", havingValue = "true", matchIfMissing = true)
public class BookingExpiryScheduler {

    private static final Logger log = LoggerFactory.getLogger(BookingExpiryScheduler.class);
    private static final int BATCH_SIZE = 50;

    private final BookingExpiryService expiryService;

    public BookingExpiryScheduler(BookingExpiryService expiryService) {
        this.expiryService = expiryService;
    }

    @Scheduled(fixedDelayString = "${app.booking.sweep-interval:PT1M}")
    public void sweep() {
        int total = 0;
        int expired;
        do {
            expired = expiryService.expireBatch(Instant.now(), BATCH_SIZE);
            total += expired;
        } while (expired == BATCH_SIZE);
        if (total > 0) {
            log.info("Expired {} unpaid booking(s) and released their seats/tickets", total);
        }
    }
}