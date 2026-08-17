package com.syllabex.service;

import com.syllabex.dto.request.CreateFacultyRequest;
import com.syllabex.dto.request.UpdateFacultyRequest;
import com.syllabex.dto.response.DashboardStatsResponse;
import com.syllabex.dto.response.UserResponse;
import com.syllabex.entity.User;
import com.syllabex.enums.Role;
import com.syllabex.exception.BadRequestException;
import com.syllabex.exception.ConflictException;
import com.syllabex.exception.ResourceNotFoundException;
import com.syllabex.repository.ChatRepository;
import com.syllabex.repository.ChatSessionRepository;
import com.syllabex.repository.DocumentRepository;
import com.syllabex.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AdminService {

    private final UserRepository        userRepository;
    private final ChatRepository        chatRepository;
    private final ChatSessionRepository sessionRepository;
    private final DocumentRepository    documentRepository;
    private final PasswordEncoder       passwordEncoder;

    // ════════════════════════════════════════════════════════
    // FACULTY MANAGEMENT
    // ════════════════════════════════════════════════════════

    @Transactional(readOnly = true)
    public List<UserResponse> getAllFaculty() {
        return userRepository.findByRoleOrderByCreatedAtDesc(Role.FACULTY)
                .stream()
                .map(UserResponse::from)
                .collect(Collectors.toList());
    }

    @Transactional
    public UserResponse createFaculty(CreateFacultyRequest req) {
        if (userRepository.existsByEmail(req.getEmail())) {
            throw new ConflictException("An account with email '" + req.getEmail() + "' already exists.");
        }

        User faculty = User.builder()
                .name(req.getName())
                .email(req.getEmail().toLowerCase().trim())
                .password(passwordEncoder.encode(req.getPassword()))
                .role(Role.FACULTY)
                .department(req.getDepartment())
                .active(true)
                .requiresPasswordSetup(false)
                .build();

        faculty = userRepository.save(faculty);
        log.info("Faculty account created: {} by admin", faculty.getEmail());
        return UserResponse.from(faculty);
    }

    @Transactional
    public UserResponse updateFaculty(Long id, UpdateFacultyRequest req) {
        User faculty = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Faculty", id));

        if (faculty.getRole() != Role.FACULTY) {
            throw new BadRequestException("User is not a faculty member.");
        }

        if (req.getName() != null && !req.getName().isBlank()) {
            faculty.setName(req.getName().trim());
        }
        if (req.getDepartment() != null) {
            faculty.setDepartment(req.getDepartment().trim());
        }
        if (req.getActive() != null) {
            faculty.setActive(req.getActive());
        }

        faculty = userRepository.save(faculty);
        log.info("Faculty updated: {}", faculty.getEmail());
        return UserResponse.from(faculty);
    }

    @Transactional
    public void deleteFaculty(Long id) {
        User faculty = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Faculty", id));

        if (faculty.getRole() != Role.FACULTY) {
            throw new BadRequestException("User is not a faculty member.");
        }

        userRepository.delete(faculty);
        log.info("Faculty deleted: id={}", id);
    }

    @Transactional
    public void resetFacultyPassword(Long id) {
        User faculty = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Faculty", id));

        if (faculty.getRole() != Role.FACULTY) {
            throw new BadRequestException("User is not a faculty member.");
        }

        // In production: generate a secure random password and email it.
        // Here we set a well-known temp password and flag requiresPasswordSetup.
        String tempPassword = "Temp@" + System.currentTimeMillis() % 100000;
        faculty.setPassword(passwordEncoder.encode(tempPassword));
        faculty.setRequiresPasswordSetup(true);
        userRepository.save(faculty);

        // TODO: Send email with tempPassword via Spring Mail
        log.info("Password reset for faculty: {} — temp: {}", faculty.getEmail(), tempPassword);
    }

    // ════════════════════════════════════════════════════════
    // STUDENT MANAGEMENT
    // ════════════════════════════════════════════════════════

    @Transactional(readOnly = true)
    public List<UserResponse> getAllStudents() {
        return userRepository.findByRoleOrderByCreatedAtDesc(Role.STUDENT)
                .stream()
                .map(UserResponse::from)
                .collect(Collectors.toList());
    }

    @Transactional
    public void deleteStudent(Long id) {
        User student = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Student", id));

        if (student.getRole() != Role.STUDENT) {
            throw new BadRequestException("User is not a student.");
        }

        userRepository.delete(student);
        log.info("Student deleted: id={}", id);
    }

    // ════════════════════════════════════════════════════════
    // DASHBOARD STATS
    // ════════════════════════════════════════════════════════

    @Transactional(readOnly = true)
    public DashboardStatsResponse getDashboardStats() {
        LocalDateTime weekAgo = LocalDateTime.now().minusDays(7);

        long totalStudents  = userRepository.countActiveByRole(Role.STUDENT);
        long totalFaculty   = userRepository.countActiveByRole(Role.FACULTY);
        long totalDocuments = documentRepository.count();
        long totalQueries   = chatRepository.count();
        long weeklyQueries  = chatRepository.countSince(weekAgo);
        long activeStudents = sessionRepository.countActiveUsersLastWeek();
        long avgPerDay      = weeklyQueries / 7;

        // 7-day daily breakdown
        List<Object[]> rawWeekly = chatRepository.countGroupedByDaySince(weekAgo);
        List<DashboardStatsResponse.DayCount> weekly = rawWeekly.stream()
                .map(r -> new DashboardStatsResponse.DayCount(
                        r[0].toString().substring(0, 3), // "Mon", "Tue" etc.
                        ((Number) r[1]).longValue(),
                        ((Number) r[1]).longValue()))
                .collect(Collectors.toCollection(ArrayList::new));

        // Pad with zeros for missing days (ensure 7 entries)
        String[] days = {"Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"};
        if (weekly.size() < 7) {
            for (String day : days) {
                boolean exists = weekly.stream().anyMatch(d -> d.getDay().equals(day));
                if (!exists) {
                    weekly.add(new DashboardStatsResponse.DayCount(day, 0L, 0L));
                }
            }
        }

        List<DashboardStatsResponse.RoleCount> roles = List.of(
                new DashboardStatsResponse.RoleCount("Students", totalStudents),
                new DashboardStatsResponse.RoleCount("Faculty",  totalFaculty)
        );

        return DashboardStatsResponse.builder()
                .totalStudents(totalStudents)
                .totalFaculty(totalFaculty)
                .totalDocuments(totalDocuments)
                .totalQueries(totalQueries)
                .queriesThisWeek(weeklyQueries)
                .activeStudents(activeStudents)
                .avgPerDay(avgPerDay)
                .weekly(weekly)
                .roles(roles)
                .build();
    }
}
