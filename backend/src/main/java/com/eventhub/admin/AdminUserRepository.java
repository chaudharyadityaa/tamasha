package com.eventhub.admin;

import com.eventhub.user.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

/** Admin-only search over users (a second repository for the same entity is fine). */
public interface AdminUserRepository extends JpaRepository<User, Long>, JpaSpecificationExecutor<User> {
}