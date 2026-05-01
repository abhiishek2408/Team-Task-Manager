import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { LayoutDashboard, FolderKanban, CheckSquare, Users, User, LogOut, Menu, X } from 'lucide-react'

export default function Layout() {
  const { user, logout, isAdmin } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  const handleLogout = () => { logout(); navigate('/') }

  const navLinks = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/projects', label: 'Projects', icon: FolderKanban },
    { to: '/tasks', label: 'My Tasks', icon: CheckSquare },
    ...(isAdmin ? [{ to: '/team', label: 'Team', icon: Users }] : []),
  ]

  return (
    <div className="layout">
      {/* Overlay */}
      {open && <div className="sidebar-overlay" onClick={() => setOpen(false)} />}

      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="brand">
            <img src="/logo.png" alt="TaskFlow" style={{ width: 32, height: 32, objectFit: 'contain' }} />
            <span className="brand-name">TaskFlow</span>
          </div>
          <button className="icon-btn" onClick={() => setOpen(false)} style={{ display: open ? 'flex' : 'none' }}><X size={18} /></button>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section">Navigation</div>
          {navLinks.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={() => setOpen(false)}>
              <Icon size={18} />{label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-card">
            <div className="avatar">{initials}</div>
            <div className="user-info">
              <span className="user-name">{user?.name}</span>
              <span className="user-email">{user?.email}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
            <button className="nav-item" style={{ flex: 1 }} onClick={() => { navigate('/profile'); setOpen(false) }}>
              <User size={16} /> Profile
            </button>
            <button className="nav-item" onClick={handleLogout}><LogOut size={16} /></button>
          </div>
        </div>
      </aside>

      <div className="main-wrapper">
        <header className="topbar">
          <button className="hamburger icon-btn" onClick={() => setOpen(true)} style={{ display: 'none' }}><Menu size={22} /></button>
          <div style={{ flex: 1 }} />
          <div className="flex items-center gap-2">
            <div className="avatar" style={{ cursor: 'pointer' }} onClick={() => navigate('/profile')}>{initials}</div>
            <span className={`badge badge-${user?.role}`}>{user?.role}</span>
          </div>
        </header>
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
