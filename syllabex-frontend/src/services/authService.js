import api from './api.js'

export const authService = {
  login: (email, password) =>
    api.post('/api/auth/login', { email, password }),

  loginWithGoogle: (googleToken) =>
    api.post('/api/auth/google', { token: googleToken }),

  setPassword: (email, newPassword, temporaryToken) =>
    api.post('/api/auth/set-password', { email, newPassword, temporaryToken }),

  getProfile: () =>
    api.get('/api/auth/me'),

  logout: () =>
    api.post('/api/auth/logout'),

  changePassword: (currentPassword, newPassword) =>
    api.put('/api/auth/change-password', { currentPassword, newPassword }),
}
