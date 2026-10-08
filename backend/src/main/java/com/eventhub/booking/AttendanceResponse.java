package com.eventhub.booking;

/** total = every ticket ever issued for the event. */
public record AttendanceResponse(long total, long checkedIn, long notYetArrived, long voided) {
}