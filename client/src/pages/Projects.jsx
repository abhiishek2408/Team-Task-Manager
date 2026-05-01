import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { getProjects, createProject, deleteProject } from '../api/api'
import { useAuth } from '../context/AuthContext'
import { Plus, Trash2, Calendar, Users, Loader2 } from 'lucide-react'

const COLORS = ['#6366f1','#ec4899','#10b981','#f59e0b','#ef4444','#06b6d4','#8b5cf6','#14b8a6']

function ProjectModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name:'', description:'', status:'planning', priority:'medium', dueDate:'', color:'#6366f1' })
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await createProject(form)
      toast.success('Project created!')
      onCreated(res.data.project)
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create project')
    } finally { setLoading(false) }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3 className="modal-title">New Project</h3>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Project Name *</label>
              <input className="form-input" required placeholder="e.g. Website Redesign"
                value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-input" rows={3} placeholder="What's this project about?"
                value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-input" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                  <option value="planning">Planning</option>
                  <option value="active">Active</option>
                  <option value="on-hold">On Hold</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Priority</label>
                <select className="form-input" value={form.priority} onChange={e => setForm({...form, priority: e.target.value})}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Due Date</label>
                <input type="date" className="form-input" value={form.dueDate} onChange={e => setForm({...form, dueDate: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Color</label>
                <div className="color-row">
                  {COLORS.map(c => (
                    <div key={c} className={`color-dot ${form.color === c ? 'selected' : ''}`}
                      style={{ background: c }} onClick={() => setForm({...form, color: c})} />
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={16} />}
              Create Project
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Projects() {
  const { isAdmin, user } = useAuth()
  const navigate = useNavigate()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    getProjects().then(res => setProjects(res.data.projects)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const handleDelete = async (e, id) => {
    e.stopPropagation()
    if (!confirm('Delete this project and all its tasks?')) return
    try {
      await deleteProject(id)
      setProjects(prev => prev.filter(p => p._id !== id))
      toast.success('Project deleted')
    } catch (err) { toast.error('Failed to delete') }
  }

  const filtered = filter === 'all' ? projects : projects.filter(p => p.status === filter)

  if (loading) return <div style={{ display:'flex', justifyContent:'center', padding:80 }}><Loader2 size={28} style={{ animation:'spin 1s linear infinite' }} /></div>

  return (
    <div>
      <div className="section-header">
        <div>
          <h1 className="section-title">Projects</h1>
          <p className="section-subtitle">{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => setShowModal(true)}><Plus size={16} />New Project</button>
        )}
      </div>

      <div className="filter-bar">
        {['all','planning','active','on-hold','completed'].map(s => (
          <button key={s} className={`tab ${filter === s ? 'active' : ''}`}
            onClick={() => setFilter(s)} style={{ textTransform: 'capitalize' }}>{s}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><Plus size={28} /></div>
          <h3 className="empty-title">No projects yet</h3>
          <p className="empty-desc">{isAdmin ? 'Create your first project to get started' : 'You are not assigned to any projects yet'}</p>
          {isAdmin && (
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setShowModal(true)}>Create Project</button>
          )}
        </div>
      ) : (
        <div className="projects-grid">
          {filtered.map(p => {
            const done = p.taskCounts?.done || 0
            const total = p.taskCounts?.total || 0
            const pct = total ? Math.round((done / total) * 100) : 0
            const canDelete = p.owner?._id === user._id || isAdmin
            return (
              <div key={p._id} className="project-card" style={{ '--color': p.color }} onClick={() => navigate(`/projects/${p._id}`)}>
                <div className="flex items-center gap-2" style={{ justifyContent:'space-between', marginBottom: 8 }}>
                  <span className={`badge badge-${p.status}`}>{p.status}</span>
                  <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                    <span className={`badge badge-${p.priority}`}>{p.priority}</span>
                    {canDelete && <button className="icon-btn" style={{ color:'var(--danger)' }} onClick={e => handleDelete(e, p._id)}><Trash2 size={14} /></button>}
                  </div>
                </div>
                <h3 className="project-name">{p.name}</h3>
                <p className="project-desc">{p.description || 'No description'}</p>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${pct}%`, background: p.color }} />
                </div>
                <div className="flex items-center gap-2" style={{ justifyContent:'space-between', fontSize: 12, color:'var(--text2)' }}>
                  <span>{done}/{total} tasks done</span>
                  <span>{pct}%</span>
                </div>
                <div className="project-meta" style={{ marginTop: 12 }}>
                  <div className="project-members">
                    {p.members?.slice(0,4).map(m => (
                      <div key={m.user?._id} className="member-avatar" title={m.user?.name}>
                        {m.user?.name?.slice(0,1).toUpperCase()}
                      </div>
                    ))}
                    {p.members?.length > 4 && <div className="member-avatar">+{p.members.length - 4}</div>}
                  </div>
                  {p.dueDate && (
                    <span className="flex items-center gap-2 text-xs text-muted">
                      <Calendar size={11} />{new Date(p.dueDate).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showModal && <ProjectModal onClose={() => setShowModal(false)} onCreated={p => setProjects(prev => [p, ...prev])} />}
    </div>
  )
}
