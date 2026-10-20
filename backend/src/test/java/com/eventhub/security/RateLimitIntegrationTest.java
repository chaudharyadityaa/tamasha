package com.eventhub.security;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.eventhub.TestcontainersConfiguration;
import com.eventhub.testsupport.TestFixtures;
import com.eventhub.user.Role;
import com.eventhub.user.User;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest(properties = {
        "app.rate-limit.login-max-failures-per-account=3",
        "app.rate-limit.login-max-failures-per-ip=6",
        "app.rate-limit.register-max-per-ip=3"
})
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@ActiveProfiles("test")
@Transactional
class RateLimitIntegrationTest {

    private static final String GENERIC_MESSAGE = "Too many attempts. Please try again later.";

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private TestFixtures fx;

    /** Sends a login request that appears to come from the given client address. */
    private ResultActions login(String clientIp, String email, String password) throws Exception {
        return mockMvc.perform(post("/api/auth/login")
                .with(request -> {
                    request.setRemoteAddr(clientIp);
                    return request;
                })
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + email + "\",\"password\":\"" + password + "\"}"));
    }

    private ResultActions register(String clientIp, String email) throws Exception {
        return mockMvc.perform(post("/api/auth/register")
                .with(request -> {
                    request.setRemoteAddr(clientIp);
                    return request;
                })
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + email + "\",\"password\":\"Sup3rSecret!\",\"fullName\":\"Test\"}"));
    }

    @Test
    void repeatedWrongPasswordsLockOutThatClientOnlyAndSayHowLongToWait() throws Exception {
        User customer = fx.user(Role.CUSTOMER);
        for (int i = 0; i < 3; i++) {
            login("10.0.0.1", customer.getEmail(), "wrong-password").andExpect(status().isUnauthorized());
        }

        // Even the correct password is refused while the lockout lasts.
        login("10.0.0.1", customer.getEmail(), "Sup3rSecret!")
                .andExpect(status().isTooManyRequests())
                .andExpect(header().exists("Retry-After"))
                .andExpect(jsonPath("$.detail").value(GENERIC_MESSAGE));

        // Someone at another address is not locked out by that client's guessing.
        login("10.0.0.2", customer.getEmail(), "Sup3rSecret!").andExpect(status().isOk());
    }

    @Test
    void aSuccessfulLoginResetsTheFailureCount() throws Exception {
        User customer = fx.user(Role.CUSTOMER);
        login("10.0.1.1", customer.getEmail(), "wrong-1").andExpect(status().isUnauthorized());
        login("10.0.1.1", customer.getEmail(), "wrong-2").andExpect(status().isUnauthorized());
        login("10.0.1.1", customer.getEmail(), "Sup3rSecret!").andExpect(status().isOk());

        login("10.0.1.1", customer.getEmail(), "wrong-3").andExpect(status().isUnauthorized());
        login("10.0.1.1", customer.getEmail(), "wrong-4").andExpect(status().isUnauthorized());
        login("10.0.1.1", customer.getEmail(), "Sup3rSecret!").andExpect(status().isOk()); // still allowed
    }

    @Test
    void unknownEmailsAreLimitedExactlyLikeRealOnesSoNothingIsRevealed() throws Exception {
        String ghost = "nobody-" + UUID.randomUUID() + "@example.com";
        for (int i = 0; i < 3; i++) {
            login("10.0.2.1", ghost, "whatever").andExpect(status().isUnauthorized());
        }

        login("10.0.2.1", ghost, "whatever")
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.detail").value(GENERIC_MESSAGE));
    }

    @Test
    void tryingOnePasswordAgainstManyAccountsFromOneAddressIsStopped() throws Exception {
        for (int i = 0; i < 6; i++) { // 6 failures, each for a different account: under the per-account limit
            login("10.0.3.1", "victim" + i + "-" + UUID.randomUUID() + "@example.com", "Summer2027!")
                    .andExpect(status().isUnauthorized());
        }

        login("10.0.3.1", "victim7@example.com", "Summer2027!").andExpect(status().isTooManyRequests());
        login("10.0.3.2", "victim7@example.com", "Summer2027!").andExpect(status().isUnauthorized()); // another client
    }

    @Test
    void registrationFloodsAreLimitedPerAddress() throws Exception {
        for (int i = 0; i < 3; i++) {
            register("10.0.4.1", "new" + i + "-" + UUID.randomUUID() + "@example.com").andExpect(status().isCreated());
        }

        register("10.0.4.1", "late-" + UUID.randomUUID() + "@example.com")
                .andExpect(status().isTooManyRequests())
                .andExpect(header().exists("Retry-After"));
        register("10.0.4.2", "other-" + UUID.randomUUID() + "@example.com").andExpect(status().isCreated());
    }
}