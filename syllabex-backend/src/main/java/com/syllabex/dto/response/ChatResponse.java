package com.syllabex.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class ChatResponse {

    private Long id;
    private String question;
    private String answer;
    private List<SourceReference> sources;
    private String status;
    private String modelUsed;
    private String sessionId;
    private LocalDateTime timestamp;

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class SourceReference {
        private String sourceFile;
        private Integer pageNumber;
        private String chunkId;
        private Double relevanceScore;
    }
}
