package com.eventhub.admin;

import com.eventhub.common.PageResponse;
import com.eventhub.security.CurrentUser;
import com.eventhub.user.Role;
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
    public PageResponse<AdminUserResponse> list(@AuthenticationPrincipal Jwt jwt,
                                                @RequestParam(required = false) Role role,
                                                @RequestParam(required = false) Boolean enabled,
                                                @RequestParam(required = false) String q,
                                                @RequestParam(defaultValue = "0") int page,
                                                @RequestParam(defaultValue = "20") int size) {
        return adminUserService.list(CurrentUser.id(jwt), role, enabled, q, page, size);
    }

    @PutMapping("/{id}/role")
    public AdminUserResponse changeRole(@AuthenticationPrincipal Jwt jwt, @PathVariable long id,
                                        @Valid @RequestBody ChangeRoleRequest request) {
        return adminUserService.changeRole(CurrentUser.id(jwt), id, request.role());
    }

    @PutMapping("/{id}/enabled")
    public AdminUserResponse setEnabled(@AuthenticationPrincipal Jwt jwt, @PathVariable long id,
                                        @Valid @RequestBody ChangeEnabledRequest request) {
        return adminUserService.setEnabled(CurrentUser.id(jwt), id, request.enabled());
    }
}