import api from './api.js'

export const documentService = {
  uploadDocument: (formData, onProgress) =>
    api.post('/api/admin/documents/upload', formData, {  // ✅ FIXED
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) =>
        onProgress && onProgress(Math.round((e.loaded * 100) / e.total)),
    }),

  getDocuments: () =>
    api.get('/api/admin/documents'),  // ✅ FIXED

  deleteDocument: (filename) =>
    api.delete(`/api/admin/documents/${encodeURIComponent(filename)}`), // ✅ FIXED
}