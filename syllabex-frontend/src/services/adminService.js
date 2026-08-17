import api from './api.js'

export const adminService = {
  // Faculty management
  getFaculty:      ()            => api.get('/api/admin/faculty'),
  createFaculty:   (data)        => api.post('/api/admin/faculty', data),
  updateFaculty:   (id, data)    => api.put(`/api/admin/faculty/${id}`, data),
  deleteFaculty:   (id)          => api.delete(`/api/admin/faculty/${id}`),
  resetFacultyPwd: (id)          => api.post(`/api/admin/faculty/${id}/reset-password`),

  // Document management
  getDocuments:    ()            => api.get('/api/admin/documents'),
  uploadDocument:  (formData, onProgress) =>
    api.post('/api/admin/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => onProgress && onProgress(Math.round((e.loaded * 100) / e.total)),
    }),
  deleteDocument:  (filename)    => api.delete(`/api/admin/documents/${encodeURIComponent(filename)}`),
  getDocumentStats: ()           => api.get('/api/admin/documents/stats'),

  // Students
  getStudents:     ()            => api.get('/api/admin/students'),
  deleteStudent:   (id)          => api.delete(`/api/admin/students/${id}`),

  // System stats
  getDashboardStats: ()          => api.get('/api/admin/stats'),
}
