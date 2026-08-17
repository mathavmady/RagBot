package com.syllabex.repository;

import com.syllabex.entity.Chat;
import com.syllabex.entity.ChatSession;
import com.syllabex.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ChatRepository extends JpaRepository<Chat, Long> {

    List<Chat> findBySessionOrderByCreatedAtAsc(ChatSession session);

    Page<Chat> findByUserOrderByCreatedAtDesc(User user, Pageable pageable);

    Page<Chat> findAllByOrderByCreatedAtDesc(Pageable pageable);

    long countByUser(User user);

    long countByCreatedAtAfter(LocalDateTime since);

    @Query("SELECT COUNT(c) FROM Chat c WHERE c.createdAt >= :since")
    long countSince(LocalDateTime since);

    @Query("""
        SELECT FUNCTION('DAYNAME', c.createdAt) as day,
               COUNT(c) as count
        FROM Chat c
        WHERE c.createdAt >= :since
        GROUP BY FUNCTION('DAYNAME', c.createdAt)
        ORDER BY MIN(c.createdAt)
        """)
    List<Object[]> countGroupedByDaySince(LocalDateTime since);

    @Query("SELECT COUNT(c) FROM Chat c WHERE c.user.id = :userId AND c.createdAt >= :since")
    long countByUserAndSince(Long userId, LocalDateTime since);
}
