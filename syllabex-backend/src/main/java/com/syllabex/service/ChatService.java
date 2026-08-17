package com.syllabex.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.syllabex.dto.request.ChatRequest;
import com.syllabex.dto.response.ChatResponse;
import com.syllabex.dto.response.DashboardStatsResponse;
import com.syllabex.dto.response.SessionResponse;
import com.syllabex.entity.Chat;
import com.syllabex.entity.ChatSession;
import com.syllabex.entity.User;
import com.syllabex.exception.BadRequestException;
import com.syllabex.exception.ResourceNotFoundException;
import com.syllabex.repository.ChatRepository;
import com.syllabex.repository.ChatSessionRepository;
import com.syllabex.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ChatService {

    private final ChatRepository        chatRepository;
    private final ChatSessionRepository sessionRepository;
    private final UserRepository        userRepository;
    private final FastApiClient         fastApiClient;
    private final ObjectMapper          objectMapper;

    // ── Ask a question ─────────────────────────────────────────
    @Transactional
    public ChatResponse ask(ChatRequest req, String userEmail) {
        if (req.getQuestion() == null || req.getQuestion().isBlank()) {
            throw new BadRequestException("Question cannot be empty.");
        }

        User user = findUser(userEmail);

        // Get or create session
        ChatSession session = sessionRepository.findBySessionId(req.getSessionId())
                .orElseGet(() -> {
                    String title = req.getQuestion().length() > 80
                            ? req.getQuestion().substring(0, 80) + "…"
                            : req.getQuestion();
                    ChatSession s = ChatSession.builder()
                            .sessionId(req.getSessionId())
                            .user(user)
                            .title(title)
                            .build();
                    return sessionRepository.save(s);
                });

        // ── Call FastAPI ────────────────────────────────────
        Map<String, Object> fastapiResponse;
        String  answer    = "";
        String  status    = "success";
        String  model     = "unknown";
        List<ChatResponse.SourceReference> sources = new ArrayList<>();

        try {
            fastapiResponse = fastApiClient.ask(
                    req.getQuestion(),
                    req.getTopK(),
                    req.getSourceFileFilter()
            );

            answer = (String) fastapiResponse.getOrDefault("answer",
                    "No answer could be generated.");
            status = (String) fastapiResponse.getOrDefault("status", "success");
            model  = (String) fastapiResponse.getOrDefault("model_used", "unknown");

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> rawSources =
                    (List<Map<String, Object>>) fastapiResponse.getOrDefault("sources",
                            List.of());

            sources = rawSources.stream().map(src ->
                    ChatResponse.SourceReference.builder()
                            .sourceFile((String) src.get("source_file"))
                            .pageNumber(src.get("page_number") instanceof Number n
                                    ? n.intValue() : null)
                            .chunkId((String) src.get("chunk_id"))
                            .relevanceScore(src.get("relevance_score") instanceof Number n
                                    ? n.doubleValue() : null)
                            .build()
            ).collect(Collectors.toList());

        } catch (Exception e) {
            log.error("FastAPI call failed: {}", e.getMessage());
            answer = "I'm sorry, I couldn't process your question right now. Please try again.";
            status = "error";
        }

        // ── Persist Q&A to MySQL ────────────────────────────
        String sourcesJson = "[]";
        try {
            sourcesJson = objectMapper.writeValueAsString(sources);
        } catch (JsonProcessingException ignored) {}

        Chat chat = Chat.builder()
                .question(req.getQuestion())
                .answer(answer)
                .sourcesJson(sourcesJson)
                .status(status)
                .modelUsed(model)
                .sourceFileFilter(req.getSourceFileFilter())
                .session(session)
                .user(user)
                .build();

        chat = chatRepository.save(chat);

        // Auto-update session title from first message if still default
        if ("New Chat".equals(session.getTitle()) && session.getChats().isEmpty()) {
            String title = req.getQuestion().length() > 80
                    ? req.getQuestion().substring(0, 80) + "…"
                    : req.getQuestion();
            session.setTitle(title);
            sessionRepository.save(session);
        }

        log.info("Chat saved [session={}, user={}]", session.getSessionId(), userEmail);

        return ChatResponse.builder()
                .id(chat.getId())
                .question(req.getQuestion())
                .answer(answer)
                .sources(sources)
                .status(status)
                .modelUsed(model)
                .sessionId(session.getSessionId())
                .timestamp(chat.getCreatedAt())
                .build();
    }

    // ── Get history for a session ──────────────────────────
    @Transactional(readOnly = true)
    public List<ChatResponse> getSessionHistory(String sessionId, String userEmail) {
        ChatSession session = sessionRepository.findBySessionId(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Session", "sessionId", sessionId));

        // Ensure the session belongs to the requesting user
        if (!session.getUser().getEmail().equalsIgnoreCase(userEmail)) {
            throw new BadRequestException("Session does not belong to this user.");
        }

        return chatRepository.findBySessionOrderByCreatedAtAsc(session)
                .stream()
                .map(this::toChatResponse)
                .collect(Collectors.toList());
    }

    // ── Get all sessions for a user ────────────────────────
    @Transactional(readOnly = true)
    public List<SessionResponse> getUserSessions(String userEmail) {
        User user = findUser(userEmail);
        return sessionRepository.findByUserOrderByUpdatedAtDesc(user)
                .stream()
                .map(SessionResponse::from)
                .collect(Collectors.toList());
    }

    // ── Delete a session ───────────────────────────────────
    @Transactional
    public void deleteSession(String sessionId, String userEmail) {
        ChatSession session = sessionRepository.findBySessionId(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Session", "sessionId", sessionId));

        if (!session.getUser().getEmail().equalsIgnoreCase(userEmail)) {
            throw new BadRequestException("Session does not belong to this user.");
        }

        sessionRepository.delete(session);
        log.info("Session deleted [id={}, user={}]", sessionId, userEmail);
    }

    // ── Paginated all-chats (faculty/admin) ────────────────
    @Transactional(readOnly = true)
    public Page<ChatResponse> getAllChats(int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return chatRepository.findAllByOrderByCreatedAtDesc(pageable)
                .map(this::toChatResponse);
    }

    // ── Stats for dashboard ────────────────────────────────
    @Transactional(readOnly = true)
    public Map<String, Object> getChatStats() {
        LocalDateTime weekAgo  = LocalDateTime.now().minusDays(7);
        LocalDateTime dayAgo   = LocalDateTime.now().minusDays(1);

        long total        = chatRepository.count();
        long thisWeek     = chatRepository.countSince(weekAgo);
        long activeUsers  = sessionRepository.countActiveUsersLastWeek();
        long avgPerDay    = thisWeek / 7;

        // Build a simple 7-day breakdown
        List<Object[]> raw = chatRepository.countGroupedByDaySince(weekAgo);
        List<Map<String, Object>> weekly = raw.stream()
                .map(r -> Map.<String, Object>of(
                        "day",   r[0].toString(),
                        "chats", r[1],
                        "q",     r[1]))
                .collect(Collectors.toList());

        return Map.of(
                "totalChats",    total,
                "queriesThisWeek", thisWeek,
                "activeStudents",  activeUsers,
                "avgPerDay",       avgPerDay,
                "weekly",          weekly
        );
    }

    // ── Helpers ────────────────────────────────────────────
    private User findUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User", "email", email));
    }

    private ChatResponse toChatResponse(Chat chat) {
        List<ChatResponse.SourceReference> sources = new ArrayList<>();
        try {
            if (chat.getSourcesJson() != null && !chat.getSourcesJson().isBlank()) {
                sources = objectMapper.readValue(
                        chat.getSourcesJson(),
                        new TypeReference<List<ChatResponse.SourceReference>>() {});
            }
        } catch (JsonProcessingException ignored) {}

        return ChatResponse.builder()
                .id(chat.getId())
                .question(chat.getQuestion())
                .answer(chat.getAnswer())
                .sources(sources)
                .status(chat.getStatus())
                .modelUsed(chat.getModelUsed())
                .sessionId(chat.getSession() != null ? chat.getSession().getSessionId() : null)
                .timestamp(chat.getCreatedAt())
                .build();
    }
}
