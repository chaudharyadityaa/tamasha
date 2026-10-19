package com.eventhub.admin;

import com.eventhub.user.Role;
import com.eventhub.user.User;
import java.time.Instant;

/** What an admin sees about an account. Never includes the password hash. */
public record AdminUserResponse(Long id, String email, String fullName, Role role, boolean enabled,
                                Instant createdAt) {

    public static AdminUserResponse from(User user) {
        return new AdminUserResponse(user.getId(), user.getEmail(), user.getFullName(), user.getRole(),
                user.isEnabled(), user.getCreatedAt());
    }
}