package com.eventhub.security;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.eventhub.TestcontainersConfiguration;
import com.eventhub.user.Role;
import com.eventhub.user.User;
import com.eventhub.user.UserRepository;
import java.util.Locale;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@Import({TestcontainersConfiguration.class, TestRoleProbeController.class})
@ActiveProfiles("test")
@Transactional
class RoleAuthorizationTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private UserRepository users;
    @Autowired
    private PasswordEncoder passwordEncoder;
    @Autowired
    private JwtTokenService tokenService;

    private String bearerFor(Role role) {
        String email = role.name().toLowerCase(Locale.ROOT) + "-" + UUID.randomUUID() + "@example.com";
        User user = users.saveAndFlush(new User(email, passwordEncoder.encode("Sup3rSecret!"), "Test", role));
        return "Bearer " + tokenService.issueFor(user).value();
    }

    // ---- /api/admin/** is for ADMIN only ----

    @Test
    void adminAreaRejectsAnonymousRequestsWith401() throws Exception {
        mockMvc.perform(get("/api/admin/users")).andExpect(status().isUnauthorized());
    }

    @Test
    void adminAreaRejectsCustomersWith403() throws Exception {
        mockMvc.perform(get("/api/admin/users").header("Authorization", bearerFor(Role.CUSTOMER)))
                .andExpect(status().isForbidden());
    }

    @Test
    void adminAreaRejectsOrganizersWith403() throws Exception {
        mockMvc.perform(get("/api/admin/users").header("Authorization", bearerFor(Role.ORGANIZER)))
                .andExpect(status().isForbidden());
    }

    @Test
    void adminAreaAllowsAdmins() throws Exception {
        mockMvc.perform(get("/api/admin/users").header("Authorization", bearerFor(Role.ADMIN)))
                .andExpect(status().isOk());
    }

    // ---- /api/organizer/** is for ORGANIZER only ----

    @Test
    void organizerAreaRejectsAnonymousRequestsWith401() throws Exception {
        mockMvc.perform(get("/api/organizer/ping")).andExpect(status().isUnauthorized());
    }

    @Test
    void organizerAreaRejectsCustomersWith403() throws Exception {
        mockMvc.perform(get("/api/organizer/ping").header("Authorization", bearerFor(Role.CUSTOMER)))
                .andExpect(status().isForbidden());
    }

    @Test
    void organizerAreaIsNotAutomaticallyOpenToAdmins() throws Exception {
        mockMvc.perform(get("/api/organizer/ping").header("Authorization", bearerFor(Role.ADMIN)))
                .andExpect(status().isForbidden());
    }

    @Test
    void organizerAreaAllowsOrganizers() throws Exception {
        mockMvc.perform(get("/api/organizer/ping").header("Authorization", bearerFor(Role.ORGANIZER)))
                .andExpect(status().isOk());
    }
}