package com.eventhub.user;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.eventhub.TestcontainersConfiguration;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

@DataJpaTest
@Import(TestcontainersConfiguration.class)
@ActiveProfiles("test")
class UserRepositoryTest {

    @Autowired
    private UserRepository users;

    @Autowired
    private JdbcTemplate jdbc;

    @Test
    void findsUserByEmailIgnoringCase() {
        users.saveAndFlush(new User("Ana@Example.com", "hash", "Ana", Role.CUSTOMER));

        assertThat(users.findByEmailIgnoreCase("ANA@example.COM")).isPresent();
        assertThat(users.existsByEmailIgnoreCase("ana@example.com")).isTrue();
    }

    @Test
    void duplicateEmailIsRejectedByTheDatabase() {
        users.saveAndFlush(new User("dup@example.com", "hash", "First", Role.CUSTOMER));

        assertThatThrownBy(() ->
                users.saveAndFlush(new User("DUP@example.com", "hash", "Second", Role.CUSTOMER)))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void databaseRejectsAnUnknownRoleEvenIfJavaCodeIsBypassed() {
        assertThatThrownBy(() -> jdbc.update(
                "INSERT INTO users (email, password_hash, full_name, role) VALUES (?, ?, ?, ?)",
                "x@example.com", "hash", "X", "HACKER"))
                .isInstanceOf(DataIntegrityViolationException.class);
    }
}