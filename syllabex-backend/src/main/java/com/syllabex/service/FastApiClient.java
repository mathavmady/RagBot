package com.syllabex.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.util.Map;

/**
 * Thin client that wraps every call to the FastAPI RAG engine.
 * All methods are blocking (block()) — the service layer handles timeouts.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class FastApiClient {

    @Qualifier("fastapiWebClient")
    private final WebClient webClient;

    @Value("${app.fastapi.timeout-seconds}")
    private int timeoutSeconds;

    // ── Ask a question ────────────────────────────────────
    @SuppressWarnings("unchecked")
    public Map<String, Object> ask(String question, Integer topK, String sourceFileFilter) {
        Map<String, Object> body = new java.util.HashMap<>();
        body.put("question", question);
        body.put("top_k", topK != null ? topK : 5);
        if (sourceFileFilter != null && !sourceFileFilter.isBlank()) {
            body.put("source_file_filter", sourceFileFilter);
        }

        log.debug("FastAPI /ask → question: {}", question);

        return webClient.post()
                .uri("/ask")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(body)
                .retrieve()
                .bodyToMono(Map.class)
                .timeout(Duration.ofSeconds(timeoutSeconds))
                .doOnError(e -> log.error("FastAPI /ask error: {}", e.getMessage()))
                .block();
    }

    // ── Upload + ingest a document ────────────────────────
    @SuppressWarnings("unchecked")
    public Map<String, Object> uploadDocument(byte[] fileBytes, String filename,
                                               String contentType) {
        MultipartBodyBuilder builder = new MultipartBodyBuilder();
        builder.part("file", new ByteArrayResource(fileBytes) {
            @Override public String getFilename() { return filename; }
        }).contentType(MediaType.parseMediaType(contentType));

        log.info("FastAPI /upload → {}", filename);

        return webClient.post()
                .uri("/upload")
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(BodyInserters.fromMultipartData(builder.build()))
                .retrieve()
                .bodyToMono(Map.class)
                .timeout(Duration.ofSeconds(300)) // ingestion can be slow
                .doOnError(e -> log.error("FastAPI /upload error: {}", e.getMessage()))
                .block();
    }

    // ── Delete a document from Pinecone ──────────────────
    @SuppressWarnings("unchecked")
    public Map<String, Object> deleteDocument(String filename) {
        log.info("FastAPI delete → {}", filename);
        return webClient.delete()
                .uri(uriBuilder -> uriBuilder
                        .path("/documents/{filename}")
                        .build(filename))
                .retrieve()
                .bodyToMono(Map.class)
                .timeout(Duration.ofSeconds(30))
                .doOnError(e -> log.error("FastAPI delete error: {}", e.getMessage()))
                .block();
    }

    // ── Health / status ────────────────────────────────────
    @SuppressWarnings("unchecked")
    public Map<String, Object> getStatus() {
        return webClient.get()
                .uri("/status")
                .retrieve()
                .bodyToMono(Map.class)
                .timeout(Duration.ofSeconds(10))
                .onErrorReturn(Map.of("status", "unreachable"))
                .block();
    }
}
