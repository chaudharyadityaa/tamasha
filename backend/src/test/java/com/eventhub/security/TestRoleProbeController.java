package com.eventhub.security;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/** Test-only endpoint under /api/organizer/ so we can verify the organizer URL rule. */
@RestController
public class TestRoleProbeController {

    @GetMapping("/api/organizer/ping")
    public String organizerPing() {
        return "organizer-ok";
    }
}