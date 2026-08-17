package com.syllabex.service;

import com.syllabex.dto.request.*;
import com.syllabex.dto.response.*;
import com.syllabex.entity.User;
import com.syllabex.enums.Role;
import com.syllabex.exception.*;
import com.syllabex.repository.UserRepository;
import com.syllabex.security.JwtService;
import com.syllabex.security.UserDetailsServiceImpl;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.*;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository         userRepository;
    private final PasswordEncoder        passwordEncoder;
    private final JwtService             jwtService;
    private final AuthenticationManager  authenticationManager;
    private final UserDetailsServiceImpl userDetailsService;
    private final GoogleTokenVerifier    googleVerifier;

    // ── Email + Password login ────────────────────────────
    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest req) {

        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            req.getEmail(),
                            req.getPassword()
                    )
            );
        } catch (BadCredentialsException e) {
            throw new BadRequestException("Invalid email or password");
        }

        User user = userRepository.findByEmail(req.getEmail())
                .orElseThrow(() -> new ResourceNotFoundException("User", "email", req.getEmail()));

        UserDetails ud    = userDetailsService.loadUserByUsername(user.getEmail());
        String      token = jwtService.generateToken(ud);

        log.info("Login success: {} [{}]", user.getEmail(), user.getRole());
        return AuthResponse.of(token, UserResponse.from(user));
    }
    // ── Google OAuth login ────────────────────────────────
    @Transactional
    public AuthResponse googleLogin(GoogleLoginRequest req) {

        GoogleTokenVerifier.GoogleUserInfo info = googleVerifier.verify(req.getToken());

        if (!info.emailVerified()) {
            throw new BadRequestException("Google email is not verified.");
        }

        // ✅ Find or create user FIRST
        User user = userRepository.findByGoogleSubjectId(info.sub())
                .or(() -> userRepository.findByEmail(info.email()))
                .orElse(null);

        boolean isNewUser = (user == null);

        if (isNewUser) {
            user = User.builder()
                    .name(info.name())
                    .email(info.email())
                    .googleSubjectId(info.sub())
                    .profilePictureUrl(info.picture())
                    .role(Role.STUDENT)
                    .active(true)
                    .requiresPasswordSetup(true)
                    .build();

            user = userRepository.save(user);
            log.info("New student registered via Google: {}", user.getEmail());
        } else {
            if (user.getGoogleSubjectId() == null) {
                user.setGoogleSubjectId(info.sub());
            }
            if (user.getProfilePictureUrl() == null && info.picture() != null) {
                user.setProfilePictureUrl(info.picture());
            }
            user = userRepository.save(user);
        }

        UserResponse userResponse = UserResponse.from(user);

        // ✅ NOW generate temp token (correct place)
        if (user.isRequiresPasswordSetup()) {
            String tempToken = jwtService.generateTemporaryToken(user.getEmail());

            AuthResponse res = AuthResponse.requiresSetup(tempToken, userResponse);

            log.info("🔥 RETURNING SETUP RESPONSE: {}", res);

            return res;
        }

        log.info("🔥 RETURNING NORMAL LOGIN");

        // ✅ Normal login
        UserDetails ud = userDetailsService.loadUserByUsername(user.getEmail());
        String token = jwtService.generateToken(ud);

        return AuthResponse.of(token, userResponse);
    }

    // ── Set password (first-time Google students) ─────────
    @Transactional
    public void setPassword(SetPasswordRequest req) {
        // Verify temporary token
        String tokenEmail;
        try {
            tokenEmail = jwtService.extractUsername(req.getTemporaryToken());
        } catch (Exception e) {
            throw new BadRequestException("Invalid or expired setup token.");
        }

        if (!jwtService.isTemporaryToken(req.getTemporaryToken())) {
            throw new BadRequestException("Invalid token type for password setup.");
        }

        if (!tokenEmail.equalsIgnoreCase(req.getEmail())) {
            throw new BadRequestException("Token does not match provided email.");
        }

        User user = userRepository.findByEmail(req.getEmail())
                .orElseThrow(() -> new ResourceNotFoundException("User", "email", req.getEmail()));

        user.setPassword(passwordEncoder.encode(req.getNewPassword()));
        user.setRequiresPasswordSetup(false);
        userRepository.save(user);

        log.info("Password set for: {}", user.getEmail());
        log.info("RECEIVED TOKEN: {}", req.getTemporaryToken());
    }

    // ── Get current user profile ──────────────────────────
    @Transactional(readOnly = true)
    public UserResponse getProfile(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User", "email", email));
        return UserResponse.from(user);
    }

    // ── Change password ───────────────────────────────────
    @Transactional
    public void changePassword(String email, ChangePasswordRequest req) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User", "email", email));

        if (!passwordEncoder.matches(req.getCurrentPassword(), user.getPassword())) {
            throw new BadRequestException("Current password is incorrect.");
        }

        user.setPassword(passwordEncoder.encode(req.getNewPassword()));
        userRepository.save(user);
        log.info("Password changed for: {}", email);
    }
}
