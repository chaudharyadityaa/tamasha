package com.eventhub.security;

import org.springframework.security.oauth2.jwt.Jwt;

public final class CurrentUser {

    private CurrentUser() {
    }

    /** The logged-in user's id, taken from the verified token. */
    public static long id(Jwt jwt) {
        return Long.parseLong(jwt.getSubject());
    }
}