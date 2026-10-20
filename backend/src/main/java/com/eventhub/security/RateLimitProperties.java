package com.eventhub.security;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

@ConfigurationProperties(prefix = "app.rate-limit")
public record RateLimitProperties(
        @DefaultValue("5") int loginMaxFailuresPerAccount,
        @DefaultValue("20") int loginMaxFailuresPerIp,
        @DefaultValue("15m") Duration loginWindow,
        @DefaultValue("10") int registerMaxPerIp,
        @DefaultValue("1h") Duration registerWindow) {
}