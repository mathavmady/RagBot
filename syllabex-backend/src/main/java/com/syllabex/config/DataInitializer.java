package com.syllabex.config;

import com.syllabex.entity.User;
import com.syllabex.enums.Role;
import com.syllabex.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.admin.email:admin@syllabex.edu}")
    private String adminEmail;

    @Value("${app.admin.password:Admin@1234}")
    private String adminPassword;

    @Value("${app.admin.name:System Administrator}")
    private String adminName;

    @Override
    public void run(String... args) {
        if (!userRepository.existsByEmail(adminEmail)) {
            User admin = User.builder()
                    .name(adminName)
                    .email(adminEmail)
                    .password(passwordEncoder.encode(adminPassword))
                    .role(Role.ADMIN)
                    .active(true)
                    .requiresPasswordSetup(false)
                    .build();
            userRepository.save(admin);
            log.info("✅  Default admin created: {}", adminEmail);
            log.info("⚠️   Change the admin password immediately in production!");
        } else {
            log.info("✅  Admin account already exists: {}", adminEmail);
        }
    }
}
