package com.syllabex.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class DashboardStatsResponse {

    private long totalStudents;
    private long totalFaculty;
    private long totalDocuments;
    private long totalQueries;
    private long queriesThisWeek;
    private long activeStudents;
    private long avgPerDay;
    private List<DayCount> weekly;

    @Data @AllArgsConstructor @NoArgsConstructor
    public static class DayCount {
        private String day;
        private long chats;
        private long q;
    }

    @Data @AllArgsConstructor @NoArgsConstructor
    public static class RoleCount {
        private String name;
        private long value;
    }

    private List<RoleCount> roles;
}
