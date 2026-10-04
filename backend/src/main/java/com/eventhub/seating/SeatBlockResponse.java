package com.eventhub.seating;

import java.util.List;

public record SeatBlockResponse(String section, List<String> rows, int seatsPerRow, int seatsCreated) {
}