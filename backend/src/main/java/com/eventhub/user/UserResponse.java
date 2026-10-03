package com.eventhub.user;

/** What the API returns about a user. Deliberately has no password or hash field. */
public record UserResponse(Long id, String email, String fullName, Role role) {

    public static UserResponse from(User user) {
        return new UserResponse(user.getId(), user.getEmail(), user.getFullName(), user.getRole());
    }
}