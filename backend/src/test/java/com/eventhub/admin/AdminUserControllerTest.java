package com.eventhub.admin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.eventhub.TestcontainersConfiguration;
import com.eventhub.security.JwtTokenService;
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
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@ActiveProfiles("test")
@Transactional
class AdminUserControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private UserRepository users;
    @Autowired
    private PasswordEncoder passwordEncoder;
    @Autowired
    private JwtTokenService tokenService;

    private User saveUser(Role role) {
        String email = role.name().toLowerCase(Locale.ROOT) + "-" + UUID.randomUUID() + "@example.com";
        return users.saveAndFlush(new User(email, passwordEncoder.encode("Sup3rSecret!"), "Test", role));
    }

    private String bearer(User user) {
        return "Bearer " + tokenService.issueFor(user).value();
    }

    private ResultActions putRole(User actor, long targetId, String json) throws Exception {
        return mockMvc.perform(put("/api/admin/users/{id}/role", targetId)
                .header("Authorization", bearer(actor))
                .contentType(MediaType.APPLICATION_JSON)
                .content(json));
    }

    @Test
    void adminCanListUsersWithoutSeeingPasswordData() throws Exception {
        User admin = saveUser(Role.ADMIN);

        mockMvc.perform(get("/api/admin/users").header("Authorization", bearer(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements", greaterThanOrEqualTo(1)))
                .andExpect(jsonPath("$.content[0].email").isNotEmpty())
                .andExpect(jsonPath("$.content[0].passwordHash").doesNotExist());
    }

    @Test
    void adminCanPromoteACustomerToOrganizer() throws Exception {
        User admin = saveUser(Role.ADMIN);
        User customer = saveUser(Role.CUSTOMER);

        putRole(admin, customer.getId(), "{\"role\":\"ORGANIZER\"}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("ORGANIZER"));

        assertThat(users.findById(customer.getId()).orElseThrow().getRole()).isEqualTo(Role.ORGANIZER);
    }

    @Test
    void adminCannotChangeTheirOwnRole() throws Exception {
        User admin = saveUser(Role.ADMIN);

        putRole(admin, admin.getId(), "{\"role\":\"CUSTOMER\"}")
                .andExpect(status().isConflict());

        assertThat(users.findById(admin.getId()).orElseThrow().getRole()).isEqualTo(Role.ADMIN);
    }

    @Test
    void changingTheRoleOfAMissingUserGives404() throws Exception {
        User admin = saveUser(Role.ADMIN);

        putRole(admin, 999_999_999L, "{\"role\":\"ORGANIZER\"}")
                .andExpect(status().isNotFound());
    }

    @Test
    void customerCannotChangeRolesAndNothingChanges() throws Exception {
        User customer = saveUser(Role.CUSTOMER);
        User victim = saveUser(Role.CUSTOMER);

        putRole(customer, victim.getId(), "{\"role\":\"ADMIN\"}")
                .andExpect(status().isForbidden());

        assertThat(users.findById(victim.getId()).orElseThrow().getRole()).isEqualTo(Role.CUSTOMER);
    }

    @Test
    void tokenOfADemotedAdminNoLongerWorksForAdminActions() throws Exception {
        User admin = saveUser(Role.ADMIN);
        User customer = saveUser(Role.CUSTOMER);
        String oldToken = bearer(admin); // still says ROLE ADMIN

        admin.setRole(Role.CUSTOMER); // demoted after the token was issued
        users.saveAndFlush(admin);

        mockMvc.perform(put("/api/admin/users/{id}/role", customer.getId())
                        .header("Authorization", oldToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"role\":\"ADMIN\"}"))
                .andExpect(status().isForbidden());

        assertThat(users.findById(customer.getId()).orElseThrow().getRole()).isEqualTo(Role.CUSTOMER);
    }

    @Test
    void unknownRoleNameIsABadRequest() throws Exception {
        User admin = saveUser(Role.ADMIN);
        User customer = saveUser(Role.CUSTOMER);

        putRole(admin, customer.getId(), "{\"role\":\"SUPERUSER\"}")
                .andExpect(status().isBadRequest());
    }

    @Test
    void missingRoleFieldIsAValidationError() throws Exception {
        User admin = saveUser(Role.ADMIN);
        User customer = saveUser(Role.CUSTOMER);

        putRole(admin, customer.getId(), "{}")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.role").exists());
    }
}