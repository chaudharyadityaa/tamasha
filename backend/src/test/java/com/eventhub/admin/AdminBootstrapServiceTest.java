package com.eventhub.admin;

import static org.assertj.core.api.Assertions.assertThat;

import com.eventhub.TestcontainersConfiguration;
import com.eventhub.user.Role;
import com.eventhub.user.User;
import com.eventhub.user.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Import(TestcontainersConfiguration.class)
@ActiveProfiles("test")
@Transactional
class AdminBootstrapServiceTest {

    @Autowired
    private AdminBootstrapService bootstrap;
    @Autowired
    private UserRepository users;
    @Autowired
    private PasswordEncoder passwordEncoder;

    @Test
    void createsAnAdminWithAHashedPasswordAndDoesNothingTheSecondTime() {
        assertThat(bootstrap.ensureAdmin("boss@example.com", "a-long-enough-password", "Administrator")).isTrue();

        User admin = users.findByEmailIgnoreCase("boss@example.com").orElseThrow();
        assertThat(admin.getRole()).isEqualTo(Role.ADMIN);
        assertThat(admin.getPasswordHash()).isNotEqualTo("a-long-enough-password");
        assertThat(passwordEncoder.matches("a-long-enough-password", admin.getPasswordHash())).isTrue();

        assertThat(bootstrap.ensureAdmin("boss@example.com", "different-password-123", "Administrator")).isFalse();
        assertThat(passwordEncoder.matches("a-long-enough-password",
                users.findByEmailIgnoreCase("boss@example.com").orElseThrow().getPasswordHash())).isTrue();
    }

    @Test
    void neverPromotesOrModifiesAnExistingAccount() {
        users.saveAndFlush(new User("ana@example.com", passwordEncoder.encode("Sup3rSecret!"), "Ana", Role.CUSTOMER));

        assertThat(bootstrap.ensureAdmin("ana@example.com", "a-long-enough-password", "Administrator")).isFalse();

        assertThat(users.findByEmailIgnoreCase("ana@example.com").orElseThrow().getRole()).isEqualTo(Role.CUSTOMER);
    }
}