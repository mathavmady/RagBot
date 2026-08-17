package com.syllabex.dto.response;

import com.syllabex.enums.Role;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class AuthResponse {

    private String token;
    private UserResponse user;
    private boolean requiresPasswordSetup;
    private String temporaryToken;

    public static AuthResponse of(String token, UserResponse user) {
        return AuthResponse.builder()
                .token(token)
                .user(user)
                .requiresPasswordSetup(false)
                .build();
    }

    public static AuthResponse requiresSetup(String tempToken, UserResponse user) {
        return AuthResponse.builder()
                .requiresPasswordSetup(true)
                .temporaryToken(tempToken)
                .user(user)
                .build();
    }
}
