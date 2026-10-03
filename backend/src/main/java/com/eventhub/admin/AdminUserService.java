package com.eventhub.admin;

import com.eventhub.common.ConflictException;
import com.eventhub.common.NotFoundException;
import com.eventhub.common.PageResponse;
import com.eventhub.user.Role;
import com.eventhub.user.User;
import com.eventhub.user.UserRepository;
import com.eventhub.user.UserResponse;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminUserService {

    private static final int MAX_PAGE_SIZE = 100;

    private final UserRepository users;

    public AdminUserService(UserRepository users) {
        this.users = users;
    }

    @Transactional(readOnly = true)
    public PageResponse<UserResponse> list(long actingUserId, int page, int size) {
        requireActiveAdmin(actingUserId);
        PageRequest pageable = PageRequest.of(
                Math.max(page, 0), Math.min(Math.max(size, 1), MAX_PAGE_SIZE), Sort.by("id"));
        return PageResponse.from(users.findAll(pageable).map(UserResponse::from));
    }

    @Transactional
    public UserResponse changeRole(long actingUserId, long targetUserId, Role newRole) {
        requireActiveAdmin(actingUserId);
        if (actingUserId == targetUserId) {
            // Guarantees at least one admin always remains.
            throw new ConflictException("You cannot change your own role");
        }
        User target = users.findById(targetUserId)
                .orElseThrow(() -> new NotFoundException("User not found"));
        target.setRole(newRole); // saved automatically when the transaction commits
        return UserResponse.from(target);
    }

    /**
     * The token says the caller is an admin, but the token can be up to an hour old.
     * For admin actions we confirm against the database that they still are.
     */
    private void requireActiveAdmin(long userId) {
        boolean stillAdmin = users.findById(userId)
                .filter(User::isEnabled)
                .map(user -> user.getRole() == Role.ADMIN)
                .orElse(false);
        if (!stillAdmin) {
            throw new AccessDeniedException("Administrator access required");
        }
    }
}