package com.syllabex.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.Map;

/**
 * Verifies Google OAuth access tokens by calling the Google UserInfo endpoint.
 * Returns a GoogleUserInfo record with the verified claims.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class GoogleTokenVerifier {

    private final WebClient.Builder webClientBuilder;

    @Value("${app.google.client-id}")
    private String googleClientId;

    private static final String GOOGLE_USERINFO_URL =
            "https://www.googleapis.com/oauth2/v3/userinfo";

    public record GoogleUserInfo(
            String sub,
            String email,
            String name,
            String picture,
            boolean emailVerified
    ) {}

    @SuppressWarnings("unchecked")
    public GoogleUserInfo verify(String accessToken) {
        try {
            Map<String, Object> info = webClientBuilder.build()
                    .get()
                    .uri(GOOGLE_USERINFO_URL)
                    .header("Authorization", "Bearer " + accessToken)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            if (info == null || info.get("sub") == null) {
                throw new RuntimeException("Invalid Google token: no subject claim");
            }

            return new GoogleUserInfo(
                    (String) info.get("sub"),
                    (String) info.get("email"),
                    (String) info.get("name"),
                    (String) info.get("picture"),
                    Boolean.TRUE.equals(info.get("email_verified"))
            );
        } catch (Exception e) {
            log.error("Google token verification failed: {}", e.getMessage());
            throw new RuntimeException("Google authentication failed: " + e.getMessage());
        }
    }
}
