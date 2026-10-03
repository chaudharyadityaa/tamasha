package com.eventhub.auth;

import com.eventhub.common.ConflictException;
import com.eventhub.user.Role;
import com.eventhub.user.User;
import com.eventhub.user.UserRepository;
import com.eventhub.user.UserResponse;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private static final String EMAIL_TAKEN = "An account with this email already exists";

    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;

    public AuthService(UserRepository users, PasswordEncoder passwordEncoder) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public UserResponse register(RegisterRequest request) {
        String email = request.email().trim();
        if (users.existsByEmailIgnoreCase(email)) {
            throw new ConflictException(EMAIL_TAKEN);
        }
        // Self-registration always creates a CUSTOMER. Privileged roles are granted by an admin.
        User user = new User(email, passwordEncoder.encode(request.password()),
                request.fullName().trim(), Role.CUSTOMER);
        try {
            return UserResponse.from(users.saveAndFlush(user));
        } catch (DataIntegrityViolationException e) {
            // Two simultaneous registrations passed the check above; the unique index caught the second.
            throw new ConflictException(EMAIL_TAKEN);
        }
    }
}