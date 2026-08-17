package com.syllabex.dto.response;

import com.syllabex.entity.Document;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class DocumentResponse {

    private Long id;
    private String filename;
    private String name;
    private String fileType;
    private Long fileSize;
    private Integer totalPages;
    private Integer totalChunks;
    private String status;
    private String uploadedBy;
    private LocalDateTime uploadedAt;

    public static DocumentResponse from(Document doc) {
        return DocumentResponse.builder()
                .id(doc.getId())
                .filename(doc.getFilename())
                .name(doc.getOriginalName())
                .fileType(doc.getFileType())
                .fileSize(doc.getFileSize())
                .totalPages(doc.getTotalPages())
                .totalChunks(doc.getTotalChunks())
                .status(doc.getStatus())
                .uploadedBy(doc.getUploadedBy() != null ? doc.getUploadedBy().getName() : null)
                .uploadedAt(doc.getUploadedAt())
                .build();
    }
}
