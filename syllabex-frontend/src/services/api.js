import axios from 'axios'
import toast from 'react-hot-toast'
import { API_BASE_URL, TOKEN_KEY } from '../config/config.js'
import { ROUTES } from '../utils/constants.js'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 300000,
})

// Attach JWT to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
  },
  (err) => Promise.reject(err)
)

// Handle errors globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status  = err.response?.status
    const message = err.response?.data?.message || err.message || 'An error occurred'

    if (status === 401) {
      localStorage.removeItem(TOKEN_KEY)
      window.location.href = ROUTES.LOGIN
      toast.error('Session expired. Please log in again.')
    } else if (status === 403) {
      toast.error('Access denied.')
    } else if (status >= 500) {
      toast.error('Server error. Please try again later.')
    }

    return Promise.reject({ status, message, data: err.response?.data })
  }
)

export default api
