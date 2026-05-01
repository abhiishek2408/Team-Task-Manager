import axios from 'axios'

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'https://team-task-manager-production-backend.up.railway.app/api' })

// Attach token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Auto-logout on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/'
    }
    return Promise.reject(err)
  }
)

// ── Auth ──────────────────────────────────────────
export const login = (data) => api.post('/auth/login', data)
export const register = (data) => api.post('/auth/register', data)
export const getMe = () => api.get('/auth/me')
export const updateProfile = (data) => api.put('/auth/profile', data)

// ── Projects ──────────────────────────────────────
export const getProjects = () => api.get('/projects')
export const getProject = (id) => api.get(`/projects/${id}`)
export const createProject = (data) => api.post('/projects', data)
export const updateProject = (id, data) => api.put(`/projects/${id}`, data)
export const deleteProject = (id) => api.delete(`/projects/${id}`)
export const addProjectMember = (id, data) => api.post(`/projects/${id}/members`, data)
export const removeProjectMember = (id, userId) => api.delete(`/projects/${id}/members/${userId}`)
export const getProjectTasks = (id) => api.get(`/projects/${id}/tasks`)

// ── Tasks ─────────────────────────────────────────
export const getDashboard = () => api.get('/tasks/dashboard')
export const getTasks = (params) => api.get('/tasks', { params })
export const createTask = (data) => api.post('/tasks', data)
export const updateTask = (id, data) => api.put(`/tasks/${id}`, data)
export const deleteTask = (id) => api.delete(`/tasks/${id}`)
export const addComment = (id, text) => api.post(`/tasks/${id}/comments`, { text })

// ── Users ─────────────────────────────────────────
export const getUsers = (search) => api.get('/users', { params: { search } })
export const updateUserRole = (id, role) => api.put(`/users/${id}/role`, { role })
export const deactivateUser = (id) => api.put(`/users/${id}/deactivate`)

export default api
