package com.syllabex.service;

import com.syllabex.dto.response.DocumentResponse;
import com.syllabex.entity.Document;
import com.syllabex.entity.User;
import com.syllabex.exception.BadRequestException;
import com.syllabex.exception.ResourceNotFoundException;
import com.syllabex.repository.DocumentRepository;
import com.syllabex.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class DocumentService {

    private final DocumentRepository documentRepository;
    private final UserRepository     userRepository;
    private final FastApiClient      fastApiClient;

    private static final Set<String> ALLOWED_TYPES = Set.of(
            "application/pdf",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    );
    private static final Set<String> ALLOWED_EXTS = Set.of(".pdf", ".docx", ".pptx");
    private static final long MAX_FILE_SIZE = 50L * 1024 * 1024; // 50 MB

    // ── Upload & Ingest ────────────────────────────────────
    @Transactional
    public DocumentResponse uploadAndIngest(MultipartFile file, String uploaderEmail) {
        // Validate
        validateFile(file);

        User uploader = userRepository.findByEmail(uploaderEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User", "email", uploaderEmail));

        String originalName = file.getOriginalFilename();
        String ext = getExtension(originalName);

        // Send to FastAPI for ingestion
        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException e) {
            throw new BadRequestException("Failed to read uploaded file: " + e.getMessage());
        }

        log.info("Sending '{}' to FastAPI for ingestion…", originalName);
        Map<String, Object> result = fastApiClient.uploadDocument(
                bytes, originalName, file.getContentType());

        if (result == null || !"success".equals(result.get("status"))) {
            String msg = result != null ? (String) result.get("message") : "Unknown error";
            throw new BadRequestException("Ingestion failed: " + msg);
        }

        Integer totalPages  = result.get("total_pages")  instanceof Number n ? n.intValue() : null;
        Integer totalChunks = result.get("total_chunks") instanceof Number n ? n.intValue() : null;

        // Save or update document record in MySQL
        Document doc = documentRepository.findByFilename(originalName)
                .orElse(Document.builder()
                        .filename(originalName)
                        .originalName(originalName)
                        .build());

        doc.setFileType(ext.replace(".", "").toUpperCase());
        doc.setFileSize(file.getSize());
        doc.setTotalPages(totalPages);
        doc.setTotalChunks(totalChunks);
        doc.setStatus("indexed");
        doc.setUploadedBy(uploader);
        doc = documentRepository.save(doc);

        log.info("Document indexed: '{}' — {} pages, {} chunks", originalName, totalPages, totalChunks);
        return DocumentResponse.from(doc);
    }

    // ── List all documents ─────────────────────────────────
    @Transactional(readOnly = true)
    public List<DocumentResponse> getAllDocuments() {
        return documentRepository.findAllByOrderByUploadedAtDesc()
                .stream()
                .map(DocumentResponse::from)
                .collect(Collectors.toList());
    }

    // ── Delete document from Pinecone + MySQL ──────────────
    @Transactional
    public void deleteDocument(String filename, String requesterEmail) {
        Document doc = documentRepository.findByFilename(filename)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Document", "filename", filename));

        // Remove from Pinecone via FastAPI
        try {
            fastApiClient.deleteDocument(filename);
            log.info("Document removed from Pinecone: '{}'", filename);
        } catch (Exception e) {
            log.warn("FastAPI delete failed for '{}': {} — removing from DB anyway",
                    filename, e.getMessage());
        }

        documentRepository.delete(doc);
        log.info("Document deleted from DB: '{}'", filename);
    }

    // ── Get document stats ─────────────────────────────────
    @Transactional(readOnly = true)
    public Map<String, Object> getStats() {
        long total  = documentRepository.count();
        long chunks = documentRepository.findAllByOrderByUploadedAtDesc()
                .stream()
                .mapToLong(d -> d.getTotalChunks() != null ? d.getTotalChunks() : 0)
                .sum();
        return Map.of("totalDocuments", total, "totalChunks", chunks);
    }

    // ── Validation ─────────────────────────────────────────
    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("File is empty or missing.");
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new BadRequestException("File exceeds the 50MB limit.");
        }
        String ext = getExtension(file.getOriginalFilename());
        if (!ALLOWED_EXTS.contains(ext.toLowerCase())) {
            throw new BadRequestException(
                    "Unsupported file type '" + ext + "'. Allowed: PDF, DOCX, PPTX.");
        }
    }

    private String getExtension(String filename) {
        if (filename == null || !filename.contains(".")) return "";
        return filename.substring(filename.lastIndexOf('.'));
    }
}
