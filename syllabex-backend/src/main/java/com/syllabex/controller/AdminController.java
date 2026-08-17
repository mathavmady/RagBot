package com.syllabex.controller;

import com.syllabex.dto.request.CreateFacultyRequest;
import com.syllabex.dto.request.UpdateFacultyRequest;
import com.syllabex.dto.response.*;
import com.syllabex.service.AdminService;
import com.syllabex.service.DocumentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasAnyRole('ADMIN','FACULTY')")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService    adminService;
    private final DocumentService documentService;

    // ══════════════════════════════════════════════════════════
    // DASHBOARD
    // ══════════════════════════════════════════════════════════

    /**
     * GET /api/admin/stats
     * Returns aggregate counts for the admin dashboard.
     */
    @GetMapping("/stats")
    public ResponseEntity<DashboardStatsResponse> getDashboardStats() {
        return ResponseEntity.ok(adminService.getDashboardStats());
    }

    // ══════════════════════════════════════════════════════════
    // FACULTY
    // ══════════════════════════════════════════════════════════

    /**
     * GET /api/admin/faculty
     * List all faculty accounts.
     */
    @GetMapping("/faculty")
    public ResponseEntity<List<UserResponse>> getAllFaculty() {
        return ResponseEntity.ok(adminService.getAllFaculty());
    }

    /**
     * POST /api/admin/faculty
     * Create a new faculty account. Only admins can do this.
     */
    @PostMapping("/faculty")
    public ResponseEntity<UserResponse> createFaculty(
            @Valid @RequestBody CreateFacultyRequest req) {
        return ResponseEntity.status(201).body(adminService.createFaculty(req));
    }

    /**
     * PUT /api/admin/faculty/{id}
     * Update faculty name, department, or active status.
     */
    @PutMapping("/faculty/{id}")
    public ResponseEntity<UserResponse> updateFaculty(
            @PathVariable Long id,
            @RequestBody UpdateFacultyRequest req) {
        return ResponseEntity.ok(adminService.updateFaculty(id, req));
    }

    /**
     * DELETE /api/admin/faculty/{id}
     * Remove a faculty account.
     */
    @DeleteMapping("/faculty/{id}")
    public ResponseEntity<ApiResponse<String>> deleteFaculty(@PathVariable Long id) {
        adminService.deleteFaculty(id);
        return ResponseEntity.ok(ApiResponse.success("Faculty member removed."));
    }

    /**
     * POST /api/admin/faculty/{id}/reset-password
     * Trigger a password reset for a faculty member.
     */
    @PostMapping("/faculty/{id}/reset-password")
    public ResponseEntity<ApiResponse<String>> resetFacultyPassword(
            @PathVariable Long id) {
        adminService.resetFacultyPassword(id);
        return ResponseEntity.ok(
                ApiResponse.success("Password has been reset. New credentials will be sent to their email."));
    }

    // ══════════════════════════════════════════════════════════
    // STUDENTS
    // ══════════════════════════════════════════════════════════

    /**
     * GET /api/admin/students
     * List all student accounts.
     */
    @GetMapping("/students")
    public ResponseEntity<List<UserResponse>> getAllStudents() {
        return ResponseEntity.ok(adminService.getAllStudents());
    }

    /**
     * DELETE /api/admin/students/{id}
     * Remove a student account.
     */
    @DeleteMapping("/students/{id}")
    public ResponseEntity<ApiResponse<String>> deleteStudent(@PathVariable Long id) {
        adminService.deleteStudent(id);
        return ResponseEntity.ok(ApiResponse.success("Student account removed."));
    }

    // ══════════════════════════════════════════════════════════
    // DOCUMENTS
    // ══════════════════════════════════════════════════════════

    /**
     * GET /api/admin/documents
     * List all indexed study documents.
     */
    @GetMapping("/documents")
    public ResponseEntity<List<DocumentResponse>> getAllDocuments() {
        return ResponseEntity.ok(documentService.getAllDocuments());
    }

    /**
     * POST /api/admin/documents/upload
     * Upload a PDF / DOCX / PPTX and ingest it into Pinecone via FastAPI.
     */
    @PostMapping(value = "/documents/upload",
                 consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<DocumentResponse> uploadDocument(
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.status(201)
                .body(documentService.uploadAndIngest(file, userDetails.getUsername()));
    }

    /**
     * DELETE /api/admin/documents/{filename}
     * Remove a document from Pinecone and the database.
     */
    @DeleteMapping("/documents/{filename}")
    public ResponseEntity<ApiResponse<String>> deleteDocument(
            @PathVariable String filename,
            @AuthenticationPrincipal UserDetails userDetails) {
        documentService.deleteDocument(filename, userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success("Document '" + filename + "' removed from index."));
    }

    /**
     * GET /api/admin/documents/stats
     * Quick count of documents and total chunks indexed.
     */
    @GetMapping("/documents/stats")
    public ResponseEntity<?> getDocumentStats() {
        return ResponseEntity.ok(documentService.getStats());
    }
}
