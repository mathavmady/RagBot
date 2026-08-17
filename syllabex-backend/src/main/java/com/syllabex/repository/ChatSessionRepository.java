package com.syllabex.repository;

import com.syllabex.entity.ChatSession;
import com.syllabex.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ChatSessionRepository extends JpaRepository<ChatSession, Long> {

    Optional<ChatSession> findBySessionId(String sessionId);

    List<ChatSession> findByUserOrderByUpdatedAtDesc(User user);

    boolean existsBySessionId(String sessionId);

    @Query("SELECT COUNT(DISTINCT s.user.id) FROM ChatSession s " +
           "WHERE s.updatedAt >= CURRENT_TIMESTAMP - 7 DAY")
    long countActiveUsersLastWeek();
}
