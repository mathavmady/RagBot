package com.syllabex.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "chats",
       indexes = {
           @Index(name = "idx_chat_session", columnList = "session_id"),
           @Index(name = "idx_chat_user",    columnList = "user_id"),
           @Index(name = "idx_chat_created", columnList = "createdAt")
       })
@EntityListeners(AuditingEntityListener.class)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Chat {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String question;

    @Column(columnDefinition = "MEDIUMTEXT")
    private String answer;

    /**
     * JSON array of source references returned by FastAPI.
     * Stored as a TEXT column — parsed in the service layer.
     * Example: [{"source_file":"ml.pdf","page_number":3,"chunk_id":"...","relevance_score":0.92}]
     */
    @Column(columnDefinition = "TEXT")
    private String sourcesJson;

    @Column(length = 20)
    @Builder.Default
    private String status = "success";

    @Column(length = 100)
    private String modelUsed;

    /** Optional: restrict this query to a specific document */
    @Column(length = 255)
    private String sourceFileFilter;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", nullable = false)
    private ChatSession session;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
