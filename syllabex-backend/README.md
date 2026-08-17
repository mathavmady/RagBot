# Syllabex — Spring Boot Backend

Central control layer for the Syllabex Intelligent Study Assistant.

## Architecture

```
React Frontend
      │
      │  REST (JSON + JWT)
      ▼
Spring Boot (port 8080)     ◄──── MySQL 8 (users, chats, sessions, docs)
      │
      │  WebClient (HTTP)
      ▼
FastAPI RAG Engine (port 8000)
      │
      ├── Qwen3 Embedding Model
      ├── Pinecone Vector DB
      └── Groq / Mistral 70B LLM
```

## Tech Stack

| Layer         | Technology                      |
|---------------|---------------------------------|
| Framework     | Spring Boot 3.2 + Java 17       |
| Security      | Spring Security + JWT (jjwt)    |
| Database      | MySQL 8 + Spring Data JPA       |
| HTTP Client   | Spring WebFlux WebClient        |
| Auth          | Google OAuth2 (UserInfo API)    |
| Validation    | Jakarta Bean Validation         |
| Utilities     | Lombok                          |

## Project Structure

```
src/main/java/com/syllabex/
├── SyllabexApplication.java
├── config/
│   ├── SecurityConfig.java        # CORS, JWT filter, role rules
│   ├── WebClientConfig.java       # FastAPI WebClient bean
│   ├── JacksonConfig.java         # ObjectMapper (Java time)
│   └── DataInitializer.java       # Seeds default admin on startup
├── controller/
│   ├── AuthController.java        # /api/auth/*
│   ├── ChatController.java        # /api/chat/*
│   ├── AdminController.java       # /api/admin/*
│   └── StatusController.java      # /api/health
├── service/
│   ├── AuthService.java
│   ├── ChatService.java
│   ├── AdminService.java
│   ├── DocumentService.java
│   ├── FastApiClient.java
│   └── GoogleTokenVerifier.java
├── security/
│   ├── JwtService.java
│   ├── JwtAuthFilter.java
│   └── UserDetailsServiceImpl.java
├── entity/
│   ├── User.java
│   ├── ChatSession.java
│   ├── Chat.java
│   └── Document.java
├── repository/
│   ├── UserRepository.java
│   ├── ChatSessionRepository.java
│   ├── ChatRepository.java
│   └── DocumentRepository.java
├── dto/
│   ├── request/   LoginRequest, GoogleLoginRequest, SetPasswordRequest,
│   │              ChangePasswordRequest, ChatRequest,
│   │              CreateFacultyRequest, UpdateFacultyRequest
│   └── response/  AuthResponse, UserResponse, ChatResponse,
│                  SessionResponse, DocumentResponse,
│                  DashboardStatsResponse, ApiResponse
├── exception/
│   ├── GlobalExceptionHandler.java
│   ├── ResourceNotFoundException.java
│   ├── ConflictException.java
│   └── BadRequestException.java
└── enums/
    └── Role.java  (ADMIN | FACULTY | STUDENT)
```

## Quick Start

### Prerequisites
- Java 17+
- MySQL 8 running
- FastAPI RAG engine running on port 8000
- Google Cloud project with OAuth 2.0 credentials

### Setup

```bash
# 1. Create the database
mysql -u root -p -e "CREATE DATABASE syllabex_db CHARACTER SET utf8mb4;"

# 2. Configure environment variables (or edit application.properties)
export DB_HOST=localhost
export DB_PORT=3306
export DB_NAME=syllabex_db
export DB_USER=root
export DB_PASSWORD=yourpassword
export JWT_SECRET=your-256-bit-secret-key-change-this-now
export GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
export FASTAPI_URL=http://localhost:8000

# 3. Run
./mvnw spring-boot:run

# Dev mode with debug logging:
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
```

### Default Admin Account
On first startup, a default admin is created:
- **Email:** `admin@syllabex.edu`
- **Password:** `Admin@1234`

> ⚠️ Change this immediately in production via `app.admin.email` and `app.admin.password` properties.

## API Endpoints

### Auth  `/api/auth`
| Method | Path               | Access  | Description                        |
|--------|--------------------|---------|------------------------------------|
| POST   | `/login`           | Public  | Email + password login             |
| POST   | `/google`          | Public  | Google OAuth login (students)      |
| POST   | `/set-password`    | Public  | First-login password setup         |
| GET    | `/me`              | Any     | Get current user profile           |
| POST   | `/logout`          | Any     | Logout (client discards JWT)       |
| PUT    | `/change-password` | Any     | Change own password                |

### Chat  `/api/chat`
| Method | Path                    | Access          | Description                      |
|--------|-------------------------|-----------------|----------------------------------|
| POST   | `/ask`                  | Any             | Ask a question (RAG pipeline)    |
| GET    | `/sessions`             | Any             | List user's chat sessions        |
| GET    | `/history/{sessionId}`  | Any             | Load messages in a session       |
| DELETE | `/sessions/{sessionId}` | Any             | Delete a session                 |
| GET    | `/all`                  | Faculty, Admin  | All chats (paginated)            |
| GET    | `/stats`                | Faculty, Admin  | Query statistics                 |

### Admin  `/api/admin`
| Method | Path                              | Access | Description               |
|--------|-----------------------------------|--------|---------------------------|
| GET    | `/stats`                          | Admin  | Dashboard statistics      |
| GET    | `/faculty`                        | Admin  | List all faculty          |
| POST   | `/faculty`                        | Admin  | Create faculty account    |
| PUT    | `/faculty/{id}`                   | Admin  | Update faculty            |
| DELETE | `/faculty/{id}`                   | Admin  | Delete faculty            |
| POST   | `/faculty/{id}/reset-password`    | Admin  | Reset faculty password    |
| GET    | `/students`                       | Admin  | List all students         |
| DELETE | `/students/{id}`                  | Admin  | Delete student            |
| GET    | `/documents`                      | Admin  | List indexed documents    |
| POST   | `/documents/upload`               | Admin  | Upload + ingest document  |
| DELETE | `/documents/{filename}`           | Admin  | Remove document           |
| GET    | `/documents/stats`                | Admin  | Document index stats      |

## Authentication Flow

```
Student (Google):
  POST /api/auth/google { token }
    → If new user: { requiresPasswordSetup: true, temporaryToken }
        → POST /api/auth/set-password { email, newPassword, temporaryToken }
    → If existing: { token, user }

Faculty/Admin (Email):
  POST /api/auth/login { email, password }
    → { token, user }

All subsequent requests:
  Authorization: Bearer <token>
```

## Environment Variables

| Variable         | Default                        | Description              |
|------------------|--------------------------------|--------------------------|
| `DB_HOST`        | localhost                      | MySQL host               |
| `DB_PORT`        | 3306                           | MySQL port               |
| `DB_NAME`        | syllabex_db                    | Database name            |
| `DB_USER`        | root                           | MySQL username           |
| `DB_PASSWORD`    | root                           | MySQL password           |
| `JWT_SECRET`     | (insecure default)             | 256-bit JWT signing key  |
| `JWT_EXPIRATION` | 86400000 (24h in ms)           | Token validity           |
| `GOOGLE_CLIENT_ID` | —                            | Google OAuth client ID   |
| `FASTAPI_URL`    | http://localhost:8000          | FastAPI engine URL       |
| `UPLOAD_DIR`     | uploads                        | Local temp upload folder |
