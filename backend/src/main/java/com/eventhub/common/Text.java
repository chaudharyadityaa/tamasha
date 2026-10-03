package com.eventhub.common;

public final class Text {

    private Text() {
    }

    /** Trims the text; returns null if it is null or blank. */
    public static String blankToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}