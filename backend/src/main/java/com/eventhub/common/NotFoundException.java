package com.eventhub.common;

/** Thrown when a requested record does not exist (maps to HTTP 404). */
public class NotFoundException extends RuntimeException {

    public NotFoundException(String message) {
        super(message);
    }
}