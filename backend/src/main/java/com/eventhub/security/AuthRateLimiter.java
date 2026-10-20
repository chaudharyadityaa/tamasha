package com.eventhub.security;

import com.eventhub.common.TooManyRequestsException;
import java.time.Instant;
import java.util.Locale;
import org.springframework.stereotype.Component;

/**
 * Slows down password guessing and account spam. Everything is keyed on the client address
 * (plus the email for logins), so one person's failures can never lock someone else out.
 */
@Component
public class AuthRateLimiter {

    private final AttemptWindow loginFailuresByAccount;
    private final AttemptWindow loginFailuresByIp;
    private final AttemptWindow registrationsByIp;

    public AuthRateLimiter(RateLimitProperties properties) {
        this.loginFailuresByAccount = new AttemptWindow(properties.loginMaxFailuresPerAccount(), properties.loginWindow());
        this.loginFailuresByIp = new AttemptWindow(properties.loginMaxFailuresPerIp(), properties.loginWindow());
        this.registrationsByIp = new AttemptWindow(properties.registerMaxPerIp(), properties.registerWindow());
    }

    /** Call before checking the password. Throws if this client has failed too often. */
    public void checkLoginAllowed(String clientIp, String email) {
        Instant now = Instant.now();
        long wait = Math.max(loginFailuresByIp.retryAfterSeconds(clientIp, now),
                loginFailuresByAccount.retryAfterSeconds(accountKey(clientIp, email), now));
        if (wait > 0) {
            throw new TooManyRequestsException(wait);
        }
    }

    public void recordLoginFailure(String clientIp, String email) {
        Instant now = Instant.now();
        loginFailuresByIp.record(clientIp, now);
        loginFailuresByAccount.record(accountKey(clientIp, email), now);
    }

    /** A correct password clears this client's counter for this account (the IP-wide count keeps its history). */
    public void recordLoginSuccess(String clientIp, String email) {
        loginFailuresByAccount.clear(accountKey(clientIp, email));
    }

    /** Every registration attempt counts, successful or not. */
    public void checkAndRecordRegistration(String clientIp) {
        Instant now = Instant.now();
        long wait = registrationsByIp.retryAfterSeconds(clientIp, now);
        if (wait > 0) {
            throw new TooManyRequestsException(wait);
        }
        registrationsByIp.record(clientIp, now);
    }

    private static String accountKey(String clientIp, String email) {
        return clientIp + "|" + email.trim().toLowerCase(Locale.ROOT);
    }
}