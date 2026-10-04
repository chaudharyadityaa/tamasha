package com.eventhub.seating;

import com.eventhub.venue.SeatRepository;

public record SeatSectionResponse(String section, long seatCount, long rowCount) {

    public static SeatSectionResponse from(SeatRepository.SectionSummary summary) {
        return new SeatSectionResponse(summary.getSection(), summary.getSeatCount(), summary.getRowCount());
    }
}