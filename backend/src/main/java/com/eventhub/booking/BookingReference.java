package com.eventhub.booking;

import java.security.SecureRandom;

/** Creates unguessable, easy-to-read booking references such as EH-7K3M9XQ2PD. */
public final class BookingReference {

    // 32 characters: digits plus letters without look-alikes (no I, L, O, U).
    private static final String ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
    private static final int RANDOM_PART_LENGTH = 10; // 32^10 = 50 bits of randomness
    private static final SecureRandom RANDOM = new SecureRandom();

    private BookingReference() {
    }

    public static String generate() {
        StringBuilder reference = new StringBuilder("EH-");
        for (int i = 0; i < RANDOM_PART_LENGTH; i++) {
            reference.append(ALPHABET.charAt(RANDOM.nextInt(ALPHABET.length())));
        }
        return reference.toString();
    }
}