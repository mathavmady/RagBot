package com.syllabex.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CreateFacultyRequest {

    @NotBlank(message = "Name is required")
    private String name;

    @NotBlank @Email(message = "Invalid email")
    private String email;

    @NotBlank
    @Size(min = 8, message = "Password must be at least 8 characters")
    private String password;

    private String department;
}
