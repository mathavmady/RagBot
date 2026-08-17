# Syllabex Frontend

Premium React.js frontend for the Syllabex Intelligent Study Assistant.

## Stack

| Layer | Tech |
|---|---|
| Framework | React 18 + Vite |
| Styling | Tailwind CSS |
| Routing | React Router v6 |
| HTTP | Axios (JWT interceptors) |
| State | React Context (Auth + Chat) |
| Charts | Recharts |
| Auth | @react-oauth/google |
| Toasts | react-hot-toast |
| Markdown | react-markdown |

## Design

- **Fonts:** Cormorant Garamond (display) · DM Sans (body) · JetBrains Mono (code)
- **Palette:** White + Crimson red `#C80000`
- **Theme:** Editorial, premium, institutional

## Quick Start

```bash
# Install
npm install

# Configure
cp .env.example .env
# → Fill in VITE_GOOGLE_CLIENT_ID and VITE_API_BASE_URL

# Dev server
npm run dev         # http://localhost:3000

# Production build
npm run build
```

## Structure

```
src/
├── components/
│   ├── common/       Button, Input, Loader, Modal
│   ├── layout/       AppLayout, Navbar, Sidebar
│   └── chat/         ChatBox, ChatInput, MessageBubble
├── pages/
│   ├── auth/         Login, SetPassword
│   ├── student/      ChatPage
│   ├── faculty/      FacultyDashboard, UploadMaterials
│   ├── admin/        AdminDashboard, ManageFaculty, ManageDocuments
│   └── common/       NotFound, Unauthorized
├── routes/           AppRoutes, ProtectedRoute
├── services/         api.js, authService, chatService, adminService
├── store/            AuthContext, ChatContext
├── hooks/            useAuth, useChat
├── utils/            constants, helpers, roleUtils
└── config/           config.js
```

## Authentication Flow

```
Student  → Google OAuth → (first login) SetPassword → ChatPage
Faculty  → Email + Password  → FacultyDashboard
Admin    → Email + Password  → AdminDashboard
```

## API Integration

All requests route through Spring Boot at `VITE_API_BASE_URL`.
JWT token stored in `localStorage` as `syllabex_token`.
Axios interceptors attach token and handle 401/403 globally.

## Role-Based Access

| Role    | Routes Accessible |
|---------|-------------------|
| STUDENT | /chat |
| FACULTY | /chat, /faculty/* |
| ADMIN   | /chat, /faculty/*, /admin/* |
