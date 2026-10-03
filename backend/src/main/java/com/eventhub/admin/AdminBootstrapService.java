package com.eventhub.admin;

import com.eventhub.user.Role;
import com.eventhub.user.User;
import com.eventhub.user.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminBootstrapService {

    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;

    public AdminBootstrapService(UserRepository users, PasswordEncoder passwordEncoder) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
    }

    /**
     * Creates an administrator if no account with this email exists.
     * Never modifies an existing account.
     *
     * @return true if a new admin was created
     */
    @Transactional
    public boolean ensureAdmin(String email, String rawPassword, String fullName) {
        if (users.existsByEmailIgnoreCase(email)) {
            return false;
        }
        users.save(new User(email, passwordEncoder.encode(rawPassword), fullName, Role.ADMIN));
        return true;
    }
}