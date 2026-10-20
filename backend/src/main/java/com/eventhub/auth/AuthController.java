package com.eventhub.auth;

import com.eventhub.common.UnauthorizedException;
import com.eventhub.security.AuthRateLimiter;
import com.eventhub.user.UserResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final AuthRateLimiter rateLimiter;

    public AuthController(AuthService authService, AuthRateLimiter rateLimiter) {
        this.authService = authService;
        this.rateLimiter = rateLimiter;
    }

    @PostMapping("/register")
    public ResponseEntity<UserResponse> register(@Valid @RequestBody RegisterRequest request,
                                                 HttpServletRequest http) {
        rateLimiter.checkAndRecordRegistration(http.getRemoteAddr());
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.register(request));
    }

    @PostMapping("/login")
    public TokenResponse login(@Valid @RequestBody LoginRequest request, HttpServletRequest http) {
        String clientIp = http.getRemoteAddr();
        rateLimiter.checkLoginAllowed(clientIp, request.email());
        try {
            TokenResponse response = authService.login(request);
            rateLimiter.recordLoginSuccess(clientIp, request.email());
            return response;
        } catch (UnauthorizedException e) {
            rateLimiter.recordLoginFailure(clientIp, request.email());
            throw e;
        }
    }

    /** Returns the logged-in user. The id comes from the verified token, never from the client. */
    @GetMapping("/me")
    public UserResponse me(@AuthenticationPrincipal Jwt jwt) {
        return authService.currentUser(Long.parseLong(jwt.getSubject()));
    }
}