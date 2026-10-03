package com.eventhub.venue;

public record VenueResponse(Long id, String name, String addressLine, String city,
                            String region, String country, String timeZone, int capacity) {

    public static VenueResponse from(Venue venue) {
        return new VenueResponse(venue.getId(), venue.getName(), venue.getAddressLine(),
                venue.getCity(), venue.getRegion(), venue.getCountry(),
                venue.getTimeZone(), venue.getCapacity());
    }
}