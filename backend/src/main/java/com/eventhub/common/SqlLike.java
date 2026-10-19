package com.eventhub.common;

import java.util.Locale;

public final class SqlLike {

    private SqlLike() {
    }

    /** A LIKE pattern that matches the text anywhere, case-insensitively, with %, _ and \ taken literally. */
    public static String contains(String text) {
        String escaped = text.toLowerCase(Locale.ROOT)
                .replace("\\", "\\\\")
                .replace("%", "\\%")
                .replace("_", "\\_");
        return "%" + escaped + "%";
    }
}