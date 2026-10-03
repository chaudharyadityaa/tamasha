package com.eventhub.admin;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

/** At startup, creates the first administrator if EVENTHUB_ADMIN_EMAIL/PASSWORD are set. */
@Component
public class AdminBootstrapRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminBootstrapRunner.class);

    private final AdminBootstrapService bootstrapService;
    private final String email;
    private final String password;

    public AdminBootstrapRunner(AdminBootstrapService bootstrapService,
                                @Value("${app.bootstrap-admin.email:}") String email,
                                @Value("${app.bootstrap-admin.password:}") String password) {
        this.bootstrapService = bootstrapService;
        this.email = email.trim();
        this.password = password;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (email.isEmpty() && password.isEmpty()) {
            return; // feature not configured
        }
        if (email.isEmpty() || !email.contains("@") || password.length() < 12 || password.length() > 72) {
            // Fail fast on a half-set or weak configuration. The message never includes the password.
            throw new IllegalStateException("Admin bootstrap needs a valid EVENTHUB_ADMIN_EMAIL "
                    + "and an EVENTHUB_ADMIN_PASSWORD of 12 to 72 characters");
        }
        if (bootstrapService.ensureAdmin(email, password, "Administrator")) {
            log.info("Created initial administrator account for {}", email);
        } else {
            log.info("Administrator bootstrap skipped: an account for {} already exists (left unchanged)", email);
        }
    }
}