package com.syllabex.controller;

import com.syllabex.dto.request.ChatRequest;
import com.syllabex.dto.response.*;
import com.syllabex.service.ChatService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;

    /**
     * POST /api/chat/ask
     * Main endpoint — proxies to FastAPI and persists the Q&A.
     * Accessible by STUDENT, FACULTY, ADMIN.
     */
    @PostMapping("/ask")
    public ResponseEntity<ChatResponse> ask(
            @Valid @RequestBody ChatRequest req,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(chatService.ask(req, userDetails.getUsername()));
    }

    /**
     * GET /api/chat/history/{sessionId}
     * Returns all messages in a session (oldest first).
     */
    @GetMapping("/history/{sessionId}")
    public ResponseEntity<List<ChatResponse>> getHistory(
            @PathVariable String sessionId,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(
                chatService.getSessionHistory(sessionId, userDetails.getUsername()));
    }

    /**
     * GET /api/chat/sessions
     * Returns all sessions for the current user (newest first).
     */
    @GetMapping("/sessions")
    public ResponseEntity<List<SessionResponse>> getSessions(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(chatService.getUserSessions(userDetails.getUsername()));
    }

    /**
     * DELETE /api/chat/sessions/{sessionId}
     * Delete a chat session and all its messages.
     */
    @DeleteMapping("/sessions/{sessionId}")
    public ResponseEntity<ApiResponse<String>> deleteSession(
            @PathVariable String sessionId,
            @AuthenticationPrincipal UserDetails userDetails) {
        chatService.deleteSession(sessionId, userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success("Session deleted."));
    }

    /**
     * GET /api/chat/all?page=0&size=20
     * Paginated view of all chats across all users.
     * FACULTY and ADMIN only.
     */
    @GetMapping("/all")
    @PreAuthorize("hasAnyRole('FACULTY','ADMIN')")
    public ResponseEntity<Page<ChatResponse>> getAllChats(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(chatService.getAllChats(page, size));
    }

    /**
     * GET /api/chat/stats
     * Aggregated query statistics for dashboards.
     * FACULTY and ADMIN only.
     */
    @GetMapping("/stats")
    @PreAuthorize("hasAnyRole('FACULTY','ADMIN')")
    public ResponseEntity<Map<String, Object>> getChatStats() {
        return ResponseEntity.ok(chatService.getChatStats());
    }
}
