package com.syllabex;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableJpaAuditing
@EnableAsync
public class
SyllabexApplication {

    public static void main(String[] args) {
        SpringApplication.run(SyllabexApplication.class, args);
        System.out.println("""

            ╔══════════════════════════════════════════╗
            ║   Syllabex Backend  —  Running on :8080  ║
            ║   RAG Study Assistant · KNCET            ║
            ╚══════════════════════════════════════════╝
            """);
    }
}
