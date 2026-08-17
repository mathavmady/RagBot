package com.syllabex.dto.response;

import com.syllabex.entity.ChatSession;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class SessionResponse {

    private Long id;
    private String sessionId;
    private String title;
    private int messageCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static SessionResponse from(ChatSession s) {
        return SessionResponse.builder()
                .id(s.getId())
                .sessionId(s.getSessionId())
                .title(s.getTitle())
                .messageCount(s.getChats() != null ? s.getChats().size() : 0)
                .createdAt(s.getCreatedAt())
                .updatedAt(s.getUpdatedAt())
                .build();
    }
}
