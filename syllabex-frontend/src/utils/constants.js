export const ROLES = {
  ADMIN:   'ADMIN',
  FACULTY: 'FACULTY',
  STUDENT: 'STUDENT',
}

export const ROUTES = {
  LOGIN:          '/login',
  SET_PASSWORD:   '/set-password',
  CHAT:           '/chat',
  FACULTY_DASH:   '/faculty/dashboard',
  UPLOAD:         '/faculty/upload',
  ADMIN_DASH:     '/admin/dashboard',
  MANAGE_FACULTY: '/admin/faculty',
  MANAGE_DOCS:    '/admin/documents',
  UNAUTHORIZED:   '/unauthorized',
}

export const SUPPORTED_DOC_TYPES = [
  { ext: 'pdf',  label: 'PDF',       mime: 'application/pdf' },
  { ext: 'docx', label: 'Word Doc',  mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
  { ext: 'pptx', label: 'PowerPoint',mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' },
]

export const MAX_FILE_SIZE_MB = 50
