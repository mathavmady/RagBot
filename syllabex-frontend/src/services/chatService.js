import api from './api.js'

export const chatService = {
  ask: (question, sessionId, sourceFileFilter = null) =>
    api.post('/api/chat/ask', {
      question,
      sessionId,
      sourceFileFilter,
      top_k: 5,
    }),

  getHistory: (sessionId) =>
    api.get(`/api/chat/history/${sessionId}`),

  getSessions: () =>
    api.get('/api/chat/sessions'),

  deleteSession: (sessionId) =>
    api.delete(`/api/chat/sessions/${sessionId}`),

  // Faculty/Admin: get all chats
  getAllChats: (page = 0, size = 20) =>
    api.get('/api/chat/all', { params: { page, size } }),

  // Stats for dashboard
  getChatStats: () =>
    api.get('/api/chat/stats'),
}
