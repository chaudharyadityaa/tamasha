package com.eventhub.auth;

import com.eventhub.user.UserResponse;

public record TokenResponse(String accessToken, String tokenType,
                            long expiresInSeconds, UserResponse user) {
}