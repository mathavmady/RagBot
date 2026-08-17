package com.syllabex.dto.request;

import lombok.Data;

@Data
public class UpdateFacultyRequest {
    private String name;
    private String department;
    private Boolean active;
}
