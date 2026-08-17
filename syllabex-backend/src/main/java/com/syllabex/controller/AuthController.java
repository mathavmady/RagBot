package com.syllabex.controller;

import com.syllabex.dto.request.*;
import com.syllabex.dto.response.*;
import com.syllabex.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Slf4j
public class AuthController {

    private final AuthService authService;

    /**
     * POST /api/auth/login
     * Standard email + password login for Faculty and Admins.
     */
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(
            @Valid @RequestBody LoginRequest req) {
        return ResponseEntity.ok(authService.login(req));
    }

    /**
     * POST /api/auth/google
     * Google OAuth login for students.
     * Returns requiresPasswordSetup=true + temporaryToken if first login.
     */
    @PostMapping("/google")
    public ResponseEntity<AuthResponse> googleLogin(
            @Valid @RequestBody GoogleLoginRequest req) {
        return ResponseEntity.ok(authService.googleLogin(req));
    }

    /**
     * POST /api/auth/set-password
     * Called by students after first Google login to set their password.
     * Requires the temporaryToken from the Google login response.
     */
    @PostMapping("/set-password")
    public ResponseEntity<ApiResponse<String>> setPassword(
            @Valid @RequestBody SetPasswordRequest req) {
        authService.setPassword(req);
        return ResponseEntity.ok(ApiResponse.success("Password set successfully. You can now log in."));
    }

    /**
     * GET /api/auth/me
     * Returns the currently authenticated user's profile.
     */
    @GetMapping("/me")
    public ResponseEntity<UserResponse> getProfile(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(authService.getProfile(userDetails.getUsername()));
    }

    /**
     * POST /api/auth/logout
     * Stateless JWT — client discards the token.
     * This endpoint exists for a clean API contract.
     */
    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<String>> logout() {
        return ResponseEntity.ok(ApiResponse.success("Logged out successfully."));
    }

    /**
     * PUT /api/auth/change-password
     * Allows any authenticated user to change their password.
     */
    @PutMapping("/change-password")
    public ResponseEntity<ApiResponse<String>> changePassword(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody ChangePasswordRequest req) {
        authService.changePassword(userDetails.getUsername(), req);
        return ResponseEntity.ok(ApiResponse.success("Password changed successfully."));
    }
}
