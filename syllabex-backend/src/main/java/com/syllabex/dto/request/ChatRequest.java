package com.syllabex.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ChatRequest {

    @NotBlank(message = "Question cannot be empty")
    private String question;

    @NotBlank(message = "Session ID is required")
    private String sessionId;

    /** Optional: restrict to one document */
    private String sourceFileFilter;

    private Integer topK = 5;
}
