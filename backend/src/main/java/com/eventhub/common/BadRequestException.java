package com.eventhub.common;

/** Thrown when a request is well-formed but breaks a business rule (maps to HTTP 400). */
public class BadRequestException extends RuntimeException {

    public BadRequestException(String message) {
        super(message);
    }
}