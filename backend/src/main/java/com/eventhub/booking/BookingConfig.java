package com.eventhub.booking;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties({BookingProperties.class, CheckInProperties.class})
public class BookingConfig {
}