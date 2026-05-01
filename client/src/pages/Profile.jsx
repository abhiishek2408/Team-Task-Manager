import { useState } from 'react'
import toast from 'react-hot-toast'
import { updateProfile } from '../api/api'
import { useAuth } from '../context/AuthContext'
import { User, Lock, Loader2 } from 'lucide-react'

export default function Profile() {
  const { user, loginUser } = useAuth()
  const [name, setName] = useState(user?.name || '')
  const [saving, setSaving] = useState(false)
  const [pwForm, setPwForm] = useState({ currentPassword:'', newPassword:'' })
  const [savingPw, setSavingPw] = useState(false)
  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2)

  const handleProfile = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      const res = await updateProfile({ name })
      loginUser(localStorage.getItem('token'), res.data.user)
      toast.success('Profile updated!')
    } catch (err) { toast.error(err.response?.data?.message || 'Failed') }
    finally { setSaving(false) }
  }

  const handlePassword = async (e) => {
    e.preventDefault(); setSavingPw(true)
    try {
      await updateProfile(pwForm)
      toast.success('Password changed!')
      setPwForm({ currentPassword:'', newPassword:'' })
    } catch (err) { toast.error(err.response?.data?.message || 'Failed') }
    finally { setSavingPw(false) }
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <div className="section-header">
        <h1 className="section-title">Profile</h1>
      </div>

      {/* Avatar */}
      <div className="card" style={{ display:'flex', alignItems:'center', gap:20, marginBottom:20 }}>
        <div className="avatar" style={{ width:72, height:72, fontSize:26 }}>{initials}</div>
        <div>
          <div style={{ fontSize:20, fontWeight:700 }}>{user?.name}</div>
          <div className="text-muted text-sm">{user?.email}</div>
          <span className={`badge badge-${user?.role}`} style={{ marginTop:6, display:'inline-block' }}>{user?.role}</span>
        </div>
      </div>

      {/* Name */}
      <div className="card" style={{ marginBottom:16 }}>
        <div className="flex items-center gap-2" style={{ marginBottom:16 }}>
          <User size={18} color="var(--primary)" />
          <h3 style={{ fontSize:15, fontWeight:700 }}>Personal Information</h3>
        </div>
        <form onSubmit={handleProfile}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input className="form-input" value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" value={user?.email} disabled style={{ opacity:0.6 }} />
          </div>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? <Loader2 size={16} style={{ animation:'spin 1s linear infinite' }} /> : null} Save Changes
          </button>
        </form>
      </div>

      {/* Password */}
      <div className="card">
        <div className="flex items-center gap-2" style={{ marginBottom:16 }}>
          <Lock size={18} color="var(--primary)" />
          <h3 style={{ fontSize:15, fontWeight:700 }}>Change Password</h3>
        </div>
        <form onSubmit={handlePassword}>
          <div className="form-group">
            <label className="form-label">Current Password</label>
            <input type="password" className="form-input" value={pwForm.currentPassword}
              onChange={e => setPwForm({...pwForm, currentPassword: e.target.value})} required />
          </div>
          <div className="form-group">
            <label className="form-label">New Password</label>
            <input type="password" className="form-input" value={pwForm.newPassword}
              onChange={e => setPwForm({...pwForm, newPassword: e.target.value})} required minLength={6} />
          </div>
          <button type="submit" className="btn btn-primary" disabled={savingPw}>
            {savingPw ? <Loader2 size={16} style={{ animation:'spin 1s linear infinite' }} /> : null} Update Password
          </button>
        </form>
      </div>
    </div>
  )
}
