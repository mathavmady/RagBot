package com.syllabex.repository;

import com.syllabex.entity.User;
import com.syllabex.enums.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    Optional<User> findByGoogleSubjectId(String googleSubjectId);

    boolean existsByEmail(String email);

    List<User> findByRoleOrderByCreatedAtDesc(Role role);

    @Query("SELECT COUNT(u) FROM User u WHERE u.role = :role AND u.active = true")
    long countActiveByRole(Role role);

    @Query("SELECT u FROM User u WHERE u.role = :role AND " +
           "(LOWER(u.name) LIKE LOWER(CONCAT('%',:search,'%')) OR " +
           " LOWER(u.email) LIKE LOWER(CONCAT('%',:search,'%')))")
    List<User> searchByRoleAndNameOrEmail(Role role, String search);
}
