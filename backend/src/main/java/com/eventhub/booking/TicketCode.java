package com.eventhub.booking;

import java.security.SecureRandom;

/** Creates unguessable ticket codes such as TK-4M7Q0XB92HZ5N3C8DKWA (100 bits of randomness). */
public final class TicketCode {

    // 32 characters: digits plus letters without look-alikes (no I, L, O, U).
    private static final String ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
    private static final int RANDOM_PART_LENGTH = 20;
    private static final SecureRandom RANDOM = new SecureRandom();

    private TicketCode() {
    }

    public static String generate() {
        StringBuilder code = new StringBuilder("TK-");
        for (int i = 0; i < RANDOM_PART_LENGTH; i++) {
            code.append(ALPHABET.charAt(RANDOM.nextInt(ALPHABET.length())));
        }
        return code.toString();
    }
}