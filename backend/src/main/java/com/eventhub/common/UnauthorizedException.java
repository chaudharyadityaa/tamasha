package com.eventhub.common;

/** Thrown when a caller could not be authenticated (maps to HTTP 401). */
public class UnauthorizedException extends RuntimeException {

    public UnauthorizedException(String message) {
        super(message);
    }
}