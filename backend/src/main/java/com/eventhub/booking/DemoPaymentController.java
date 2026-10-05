package com.eventhub.booking;

import com.eventhub.security.CurrentUser;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Exists only when demo payments are enabled. The response says "demo": true. */
@RestController
@RequestMapping("/api/bookings/{bookingId}/demo-payment")
@ConditionalOnProperty(name = "app.payments.demo-enabled", havingValue = "true")
public class DemoPaymentController {

    private final DemoPaymentService demoPaymentService;

    public DemoPaymentController(DemoPaymentService demoPaymentService) {
        this.demoPaymentService = demoPaymentService;
    }

    @PostMapping
    public BookingResponse pay(@AuthenticationPrincipal Jwt jwt, @PathVariable long bookingId) {
        return demoPaymentService.pay(CurrentUser.id(jwt), bookingId);
    }
}