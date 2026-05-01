import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { getTasks, updateTask, deleteTask, getProjects, createTask, getProjectTasks, getProject } from '../api/api'
import { Trash2, Plus, Loader2, Clock, UserCheck } from 'lucide-react'

const COLS = ['todo','in-progress','review','done']
const COL_LABELS = { todo:'To Do','in-progress':'In Progress', review:'Review', done:'Done' }

export default function Tasks() {
  const [tasks, setTasks] = useState([])
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ status:'', priority:'', projectId:'' })
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ title:'', description:'', project:'', assignee:'', status:'todo', priority:'medium', dueDate:'' })
  const [saving, setSaving] = useState(false)
  const [projectMembers, setProjectMembers] = useState([])  // members of currently-selected project
  const [loadingMembers, setLoadingMembers] = useState(false)

  const load = () => {
    const params = {}
    if (filters.status) params.status = filters.status
    if (filters.priority) params.priority = filters.priority
    if (filters.projectId) params.projectId = filters.projectId
    getTasks(params).then(r => setTasks(r.data.tasks)).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [filters])
  useEffect(() => { getProjects().then(r => setProjects(r.data.projects)).catch(() => {}) }, [])

  const handleStatus = async (id, status) => {
    try {
      const res = await updateTask(id, { status })
      setTasks(prev => prev.map(t => t._id === id ? res.data.task : t))
    } catch { toast.error('Failed') }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete task?')) return
    try { await deleteTask(id); setTasks(prev => prev.filter(t => t._id !== id)); toast.success('Deleted') }
    catch { toast.error('Failed') }
  }

  // When project changes in the modal, fetch its members for the assignee dropdown
  const handleProjectChange = async (projectId) => {
    setForm(f => ({ ...f, project: projectId, assignee: '' }))
    if (!projectId) { setProjectMembers([]); return }
    setLoadingMembers(true)
    try {
      const res = await getProject(projectId)
      setProjectMembers(res.data.project.members || [])
    } catch { setProjectMembers([]) }
    finally { setLoadingMembers(false) }
  }

  const handleCreate = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      const payload = { ...form, assignee: form.assignee || null }
      const res = await createTask(payload)
      setTasks(prev => [res.data.task, ...prev])
      toast.success('Task created'); setShowModal(false)
      setForm({ title:'', description:'', project:'', assignee:'', status:'todo', priority:'medium', dueDate:'' })
      setProjectMembers([])
    } catch (err) { toast.error(err.response?.data?.message || 'Failed') }
    finally { setSaving(false) }
  }

  if (loading) return <div style={{ display:'flex', justifyContent:'center', padding:80 }}><Loader2 size={28} style={{ animation:'spin 1s linear infinite' }} /></div>

  const overdue = tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done')

  return (
    <div>
      <div className="section-header">
        <div>
          <h1 className="section-title">My Tasks</h1>
          <p className="section-subtitle">{tasks.length} tasks · {overdue.length} overdue</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}><Plus size={16} />New Task</button>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <select className="filter-select" value={filters.status} onChange={e => setFilters({...filters, status: e.target.value})}>
          <option value="">All Statuses</option>
          {COLS.map(s => <option key={s} value={s}>{COL_LABELS[s]}</option>)}
        </select>
        <select className="filter-select" value={filters.priority} onChange={e => setFilters({...filters, priority: e.target.value})}>
          <option value="">All Priorities</option>
          <option value="low">Low</option><option value="medium">Medium</option>
          <option value="high">High</option><option value="critical">Critical</option>
        </select>
        <select className="filter-select" value={filters.projectId} onChange={e => setFilters({...filters, projectId: e.target.value})}>
          <option value="">All Projects</option>
          {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
        </select>
        {(filters.status || filters.priority || filters.projectId) && (
          <button className="btn btn-ghost btn-sm" onClick={() => setFilters({ status:'', priority:'', projectId:'' })}>Clear</button>
        )}
      </div>

      {tasks.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><Plus size={28} /></div>
          <h3 className="empty-title">No tasks found</h3>
          <p className="empty-desc">Create a task or adjust your filters</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Task</th><th>Project</th><th>Assignee</th><th>Status</th><th>Priority</th><th>Due Date</th><th>Actions</th></tr></thead>
            <tbody>
              {tasks.map(t => {
                const overdue = t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done'
                return (
                  <tr key={t._id}>
                    <td>
                      <div style={{ fontWeight:600 }}>{t.title}</div>
                      {t.description && <div className="text-xs text-muted" style={{ marginTop:2 }}>{t.description.slice(0,60)}{t.description.length > 60 ? '...' : ''}</div>}
                    </td>
                    <td>
                      {t.project ? (
                        <span className="flex items-center gap-2 text-sm">
                          <span style={{ width:8, height:8, borderRadius:'50%', background: t.project.color, display:'inline-block' }} />
                          {t.project.name}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="text-sm">{t.assignee?.name || <span className="text-muted">Unassigned</span>}</td>
                    <td>
                      <select className="filter-select" value={t.status} onChange={e => handleStatus(t._id, e.target.value)} style={{ fontSize:12 }}>
                        {COLS.map(s => <option key={s} value={s}>{COL_LABELS[s]}</option>)}
                      </select>
                    </td>
                    <td><span className={`badge badge-${t.priority}`}>{t.priority}</span></td>
                    <td>
                      {t.dueDate ? (
                        <span className={`flex items-center gap-2 text-sm ${overdue ? 'text-danger' : 'text-muted'}`}>
                          <Clock size={12} />{new Date(t.dueDate).toLocaleDateString()}
                          {overdue && <span style={{ fontSize:10, fontWeight:700 }}>OVERDUE</span>}
                        </span>
                      ) : <span className="text-muted text-sm">—</span>}
                    </td>
                    <td>
                      <button className="icon-btn" style={{ color:'var(--danger)' }} onClick={() => handleDelete(t._id)}><Trash2 size={15} /></button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">New Task</h3>
              <button className="icon-btn" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Title *</label>
                  <input className="form-input" required value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="Task title" />
                </div>
                <div className="form-group">
                  <label className="form-label">Project *</label>
                  <select className="form-input" required value={form.project} onChange={e => handleProjectChange(e.target.value)}>
                    <option value="">Select project...</option>
                    {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">
                    <span className="flex items-center gap-2"><UserCheck size={14} /> Assign To</span>
                  </label>
                  <select
                    className="form-input"
                    value={form.assignee}
                    onChange={e => setForm({...form, assignee: e.target.value})}
                    disabled={!form.project || loadingMembers}
                  >
                    <option value="">{loadingMembers ? 'Loading members...' : form.project ? 'Unassigned' : 'Select a project first'}</option>
                    {projectMembers.map(m => (
                      <option key={m.user?._id} value={m.user?._id}>
                        {m.user?.name} ({m.role})
                      </option>
                    ))}
                  </select>
                  {form.project && !loadingMembers && projectMembers.length === 0 && (
                    <span className="text-xs text-muted" style={{ marginTop: 4 }}>No members in this project yet</span>
                  )}
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select className="form-input" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                      {COLS.map(s => <option key={s} value={s}>{COL_LABELS[s]}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Priority</label>
                    <select className="form-input" value={form.priority} onChange={e => setForm({...form, priority: e.target.value})}>
                      <option value="low">Low</option><option value="medium">Medium</option>
                      <option value="high">High</option><option value="critical">Critical</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Due Date</label>
                  <input type="date" className="form-input" value={form.dueDate} onChange={e => setForm({...form, dueDate: e.target.value})} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <Loader2 size={16} style={{ animation:'spin 1s linear infinite' }} /> : <Plus size={16} />} Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
