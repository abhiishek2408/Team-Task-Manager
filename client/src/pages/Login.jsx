import { useState } from 'react'
import toast from 'react-hot-toast'
import { login, register } from '../api/api'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'

export default function Login() {
  const { loginUser } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('login')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)

  const [loginData, setLoginData] = useState({ email: '', password: '' })
  const [regData, setRegData] = useState({ name: '', email: '', password: '', role: 'member' })

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await login(loginData)
      loginUser(res.data.token, res.data.user)
      toast.success(`Welcome back, ${res.data.user.name}!`)
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed')
    } finally { setLoading(false) }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await register(regData)
      loginUser(res.data.token, res.data.user)
      toast.success('Account created!')
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || 'Registration failed')
    } finally { setLoading(false) }
  }

  const fillDemo = (email, password) => setLoginData({ email, password })

  return (
    <div className="auth-page">
      <div className="auth-bg">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
      </div>

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 420 }}>
        <div className="auth-brand" style={{ marginBottom: 24 }}>
          <img src="/logo.png" alt="TaskFlow" style={{ width: 60, height: 60, objectFit: 'contain' }} />
          <span className="brand-text">TaskFlow</span>
        </div>

        <div className="auth-card">
          <div className="auth-tabs">
            <button className={`auth-tab ${tab === 'login' ? 'active' : ''}`} onClick={() => setTab('login')}>Sign In</button>
            <button className={`auth-tab ${tab === 'register' ? 'active' : ''}`} onClick={() => setTab('register')}>Sign Up</button>
          </div>

          {tab === 'login' ? (
            <form onSubmit={handleLogin}>
              <h2 className="auth-title">Welcome back</h2>
              <p className="auth-subtitle">Sign in to your workspace</p>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" required placeholder="you@example.com"
                  value={loginData.email} onChange={e => setLoginData({ ...loginData, email: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <div className="input-with-icon">
                  <input className="form-input" type={show ? 'text' : 'password'} required placeholder="Enter password"
                    value={loginData.password} onChange={e => setLoginData({ ...loginData, password: e.target.value })} />
                  <button type="button" className="input-icon-btn" onClick={() => setShow(!show)}>
                    {show ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                {loading ? <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> : 'Sign In'}
              </button>
              <div className="demo-row">
                <div>
                  <p className="demo-label">Quick demo:</p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" className="demo-chip" onClick={() => fillDemo('admin@taskmanager.com', 'admin123')}>Admin</button>
                    <button type="button" className="demo-chip" onClick={() => fillDemo('priya@taskmanager.com', 'member123')}>Member</button>
                  </div>
                </div>
              </div>
            </form>
          ) : (
            <form onSubmit={handleRegister}>
              <h2 className="auth-title">Create account</h2>
              <p className="auth-subtitle">Join your team on TaskFlow</p>
              <div className="form-group">
                <label className="form-label">Full name</label>
                <input className="form-input" type="text" required placeholder="Enter Your Name"
                  value={regData.name} onChange={e => setRegData({ ...regData, name: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" required placeholder="you@example.com"
                  value={regData.email} onChange={e => setRegData({ ...regData, email: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <div className="input-with-icon">
                  <input className="form-input" type={show ? 'text' : 'password'} required placeholder="Min 6 characters"
                    value={regData.password} onChange={e => setRegData({ ...regData, password: e.target.value })} />
                  <button type="button" className="input-icon-btn" onClick={() => setShow(!show)}>
                    {show ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Role</label>
                <select className="form-input" value={regData.role} onChange={e => setRegData({ ...regData, role: e.target.value })}>
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                {loading ? <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> : 'Create Account'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
