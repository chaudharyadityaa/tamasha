package com.eventhub.auth;

import com.eventhub.common.ConflictException;
import com.eventhub.common.UnauthorizedException;
import com.eventhub.security.JwtTokenService;
import com.eventhub.user.Role;
import com.eventhub.user.User;
import com.eventhub.user.UserRepository;
import com.eventhub.user.UserResponse;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private static final String EMAIL_TAKEN = "An account with this email already exists";
    private static final String BAD_LOGIN = "Invalid email or password";

    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtTokenService tokenService;

    public AuthService(UserRepository users, PasswordEncoder passwordEncoder,
                       AuthenticationManager authenticationManager, JwtTokenService tokenService) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.tokenService = tokenService;
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

    @Transactional(readOnly = true)
    public TokenResponse login(LoginRequest request) {
        String email = request.email().trim();
        try {
            // Verifies the BCrypt hash, and rejects disabled accounts.
            authenticationManager.authenticate(
                    UsernamePasswordAuthenticationToken.unauthenticated(email, request.password()));
        } catch (AuthenticationException e) {
            // Same message for wrong password, unknown email and disabled account.
            throw new UnauthorizedException(BAD_LOGIN);
        }
        User user = users.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new UnauthorizedException(BAD_LOGIN));
        JwtTokenService.AccessToken token = tokenService.issueFor(user);
        return new TokenResponse(token.value(), "Bearer", token.expiresInSeconds(), UserResponse.from(user));
    }

    @Transactional(readOnly = true)
    public UserResponse currentUser(long userId) {
        // A valid token is not enough: the account must still exist and be enabled.
        User user = users.findById(userId)
                .filter(User::isEnabled)
                .orElseThrow(() -> new UnauthorizedException("Account is not available"));
        return UserResponse.from(user);
    }
}