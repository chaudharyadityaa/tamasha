package com.eventhub.booking;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

@ConfigurationProperties(prefix = "app.checkin")
public record CheckInProperties(@DefaultValue("6h") Duration opensBefore) {
}