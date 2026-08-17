package com.syllabex.controller;

import com.syllabex.service.FastApiClient;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class StatusController {

    private final FastApiClient fastApiClient;

    /**
     * GET /api/health
     * Quick health check — returns Spring Boot status + FastAPI status.
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        Map<String, Object> fastapiStatus;
        try {
            fastapiStatus = fastApiClient.getStatus();
        } catch (Exception e) {
            fastapiStatus = Map.of("status", "unreachable", "error", e.getMessage());
        }

        return ResponseEntity.ok(Map.of(
                "status",       "healthy",
                "service",      "Syllabex Backend",
                "timestamp",    LocalDateTime.now().toString(),
                "fastapiEngine", fastapiStatus
        ));
    }
}
