package com.syllabex.repository;

import com.syllabex.entity.Document;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DocumentRepository extends JpaRepository<Document, Long> {

    Optional<Document> findByFilename(String filename);

    Optional<Document> findByOriginalName(String originalName);

    List<Document> findAllByOrderByUploadedAtDesc();

    boolean existsByFilename(String filename);

    void deleteByFilename(String filename);
}
