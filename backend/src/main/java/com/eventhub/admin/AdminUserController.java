package com.eventhub.admin;

import com.eventhub.common.PageResponse;
import com.eventhub.user.UserResponse;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/users")
public class AdminUserController {

    private final AdminUserService adminUserService;

    public AdminUserController(AdminUserService adminUserService) {
        this.adminUserService = adminUserService;
    }

    @GetMapping
    public PageResponse<UserResponse> list(@AuthenticationPrincipal Jwt jwt,
                                           @RequestParam(defaultValue = "0") int page,
                                           @RequestParam(defaultValue = "20") int size) {
        return adminUserService.list(actingUserId(jwt), page, size);
    }

    @PutMapping("/{id}/role")
    public UserResponse changeRole(@AuthenticationPrincipal Jwt jwt,
                                   @PathVariable long id,
                                   @Valid @RequestBody ChangeRoleRequest request) {
        return adminUserService.changeRole(actingUserId(jwt), id, request.role());
    }

    /** The acting user always comes from the verified token, never from the request. */
    private long actingUserId(Jwt jwt) {
        return Long.parseLong(jwt.getSubject());
    }
}