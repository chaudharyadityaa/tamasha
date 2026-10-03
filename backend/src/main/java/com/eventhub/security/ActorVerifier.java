package com.eventhub.security;

import com.eventhub.user.Role;
import com.eventhub.user.User;
import com.eventhub.user.UserRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;

/**
 * A token's role claim can be up to an hour old. Services call this to confirm,
 * against the database, that the caller still exists, is enabled and has the role.
 */
@Component
public class ActorVerifier {

    private final UserRepository users;

    public ActorVerifier(UserRepository users) {
        this.users = users;
    }

    public User requireRole(long userId, Role role) {
        return users.findById(userId)
                .filter(User::isEnabled)
                .filter(user -> user.getRole() == role)
                .orElseThrow(() -> new AccessDeniedException("Insufficient permissions"));
    }
}