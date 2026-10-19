package com.eventhub.admin;

import com.eventhub.common.BadRequestException;
import com.eventhub.common.ConflictException;
import com.eventhub.common.NotFoundException;
import com.eventhub.common.PageResponse;
import com.eventhub.common.SqlLike;
import com.eventhub.common.Text;
import com.eventhub.security.ActorVerifier;
import com.eventhub.user.Role;
import com.eventhub.user.User;
import com.eventhub.user.UserRepository;
import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.util.List;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminUserService {

    private static final int MAX_PAGE_SIZE = 100;
    private static final int MAX_SEARCH_LENGTH = 100;

    private final UserRepository users;
    private final AdminUserRepository adminUsers;
    private final ActorVerifier actors;

    public AdminUserService(UserRepository users, AdminUserRepository adminUsers, ActorVerifier actors) {
        this.users = users;
        this.adminUsers = adminUsers;
        this.actors = actors;
    }

    /** Optional filters: role, enabled, and q (matches email or name, ignoring case). */
    @Transactional(readOnly = true)
    public PageResponse<AdminUserResponse> list(long adminId, Role role, Boolean enabled, String q,
                                                int page, int size) {
        actors.requireRole(adminId, Role.ADMIN);
        String text = Text.blankToNull(q);
        if (text != null && text.length() > MAX_SEARCH_LENGTH) {
            throw new BadRequestException("Search text is too long");
        }
        Specification<User> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (role != null) {
                predicates.add(cb.equal(root.get("role"), role));
            }
            if (enabled != null) {
                predicates.add(cb.equal(root.<Boolean>get("enabled"), enabled));
            }
            if (text != null) {
                String pattern = SqlLike.contains(text);
                predicates.add(cb.or(
                        cb.like(cb.lower(root.<String>get("email")), pattern, '\\'),
                        cb.like(cb.lower(root.<String>get("fullName")), pattern, '\\')));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
        PageRequest pageable = PageRequest.of(Math.max(page, 0),
                Math.min(Math.max(size, 1), MAX_PAGE_SIZE), Sort.by("id"));
        return PageResponse.from(adminUsers.findAll(spec, pageable).map(AdminUserResponse::from));
    }

    @Transactional
    public AdminUserResponse changeRole(long adminId, long targetUserId, Role newRole) {
        actors.requireRole(adminId, Role.ADMIN);
        if (adminId == targetUserId) {
            // Guarantees at least one admin always remains.
            throw new ConflictException("You cannot change your own role");
        }
        User target = users.findById(targetUserId)
                .orElseThrow(() -> new NotFoundException("User not found"));
        target.setRole(newRole); // saved automatically when the transaction commits
        return AdminUserResponse.from(target);
    }

    /** Disabled accounts cannot log in, and their existing tokens stop working for account-checked actions. */
    @Transactional
    public AdminUserResponse setEnabled(long adminId, long targetUserId, boolean enabled) {
        actors.requireRole(adminId, Role.ADMIN);
        if (adminId == targetUserId) {
            throw new ConflictException("You cannot disable or enable your own account");
        }
        User target = users.findById(targetUserId)
                .orElseThrow(() -> new NotFoundException("User not found"));
        target.setEnabled(enabled);
        return AdminUserResponse.from(target);
    }
}