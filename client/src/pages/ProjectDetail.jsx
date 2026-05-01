import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { getProject, getProjectTasks, createTask, updateTask, deleteTask, updateProject, getUsers, addProjectMember, removeProjectMember } from '../api/api'
import { useAuth } from '../context/AuthContext'
import { ArrowLeft, Plus, Loader2, Trash2, UserPlus, Settings } from 'lucide-react'

const COLS = ['todo','in-progress','review','done']
const COL_LABELS = { todo:'To Do', 'in-progress':'In Progress', review:'Review', done:'Done' }
const COL_COLORS = { todo:'#a6adc8', 'in-progress':'#89dceb', review:'#f9e2af', done:'#a6e3a1' }

function TaskModal({ projectId, members, task, onClose, onSave }) {
  const [form, setForm] = useState(task ? {
    title: task.title, description: task.description, assignee: task.assignee?._id || '',
    status: task.status, priority: task.priority, dueDate: task.dueDate ? task.dueDate.slice(0,10) : ''
  } : { title:'', description:'', assignee:'', status:'todo', priority:'medium', dueDate:'' })
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault(); setLoading(true)
    try {
      let res
      if (task) res = await updateTask(task._id, { ...form, assignee: form.assignee || null })
      else res = await createTask({ ...form, project: projectId, assignee: form.assignee || null })
      toast.success(task ? 'Task updated' : 'Task created')
      onSave(res.data.task)
      onClose()
    } catch (err) { toast.error(err.response?.data?.message || 'Failed') }
    finally { setLoading(false) }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3 className="modal-title">{task ? 'Edit Task' : 'New Task'}</h3>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Title *</label>
              <input className="form-input" required value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="Task title" />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-input" rows={3} value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Details..." />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Assignee</label>
                <select className="form-input" value={form.assignee} onChange={e => setForm({...form, assignee: e.target.value})}>
                  <option value="">Unassigned</option>
                  {members.map(m => <option key={m.user?._id} value={m.user?._id}>{m.user?.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-input" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                  {COLS.map(s => <option key={s} value={s}>{COL_LABELS[s]}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Priority</label>
                <select className="form-input" value={form.priority} onChange={e => setForm({...form, priority: e.target.value})}>
                  <option value="low">Low</option><option value="medium">Medium</option>
                  <option value="high">High</option><option value="critical">Critical</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Due Date</label>
                <input type="date" className="form-input" value={form.dueDate} onChange={e => setForm({...form, dueDate: e.target.value})} />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <Loader2 size={16} style={{ animation:'spin 1s linear infinite' }} /> : <Plus size={16} />}
              {task ? 'Update' : 'Create'} Task
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function ProjectDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, isAdmin } = useAuth()
  const [project, setProject] = useState(null)
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [editTask, setEditTask] = useState(null)
  const [view, setView] = useState('kanban')
  const [allUsers, setAllUsers] = useState([])
  const [memberEmail, setMemberEmail] = useState('')

  useEffect(() => {
    Promise.all([
      getProject(id).then(r => setProject(r.data.project)),
      getProjectTasks(id).then(r => setTasks(r.data.tasks)),
      getUsers().then(r => setAllUsers(r.data.users)),
    ]).catch(() => navigate('/projects')).finally(() => setLoading(false))
  }, [id])

  const handleTaskSave = (task) => {
    setTasks(prev => {
      const idx = prev.findIndex(t => t._id === task._id)
      if (idx >= 0) { const n = [...prev]; n[idx] = task; return n }
      return [task, ...prev]
    })
  }

  const handleDeleteTask = async (taskId, e) => {
    e.stopPropagation()
    if (!confirm('Delete this task?')) return
    try {
      await deleteTask(taskId)
      setTasks(prev => prev.filter(t => t._id !== taskId))
      toast.success('Task deleted')
    } catch { toast.error('Failed') }
  }

  const handleStatusChange = async (taskId, status) => {
    try {
      const res = await updateTask(taskId, { status })
      handleTaskSave(res.data.task)
    } catch { toast.error('Failed to update') }
  }

  const handleAddMember = async () => {
    const found = allUsers.find(u => u.email === memberEmail.trim())
    if (!found) return toast.error('User not found')
    try {
      const res = await addProjectMember(id, { userId: found._id })
      setProject(res.data.project)
      setMemberEmail('')
      toast.success('Member added')
    } catch (err) { toast.error(err.response?.data?.message || 'Failed') }
  }

  const handleRemoveMember = async (userId) => {
    if (!confirm('Remove this member?')) return
    try {
      await removeProjectMember(id, userId)
      setProject(p => ({ ...p, members: p.members.filter(m => m.user?._id !== userId) }))
      toast.success('Member removed')
    } catch { toast.error('Failed') }
  }

  if (loading) return <div style={{ display:'flex', justifyContent:'center', padding:80 }}><Loader2 size={28} style={{ animation:'spin 1s linear infinite' }} /></div>
  if (!project) return null

  const isProjectAdmin = project.owner?._id === user._id || isAdmin ||
    project.members?.some(m => m.user?._id === user._id && m.role === 'admin')

  const isMember = isProjectAdmin || project.members?.some(m => m.user?._id === user._id)

  const colTasks = (col) => tasks.filter(t => t.status === col)

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
        <button className="icon-btn" onClick={() => navigate('/projects')}><ArrowLeft size={20} /></button>
        <div style={{ flex:1 }}>
          <div className="flex items-center gap-2">
            <div style={{ width:12, height:12, borderRadius:'50%', background: project.color }} />
            <h1 style={{ fontSize:22, fontWeight:800 }}>{project.name}</h1>
            <span className={`badge badge-${project.status}`}>{project.status}</span>
            <span className={`badge badge-${project.priority}`}>{project.priority}</span>
          </div>
          {project.description && <p className="text-muted text-sm" style={{ marginTop:4 }}>{project.description}</p>}
        </div>
        {isMember && (
          <button className="btn btn-primary" onClick={() => setShowTaskModal(true)}><Plus size={16} />Add Task</button>
        )}
      </div>

      {/* View tabs */}
      <div className="flex items-center gap-3" style={{ marginBottom:20, justifyContent:'space-between', flexWrap:'wrap' }}>
        <div className="tabs" style={{ marginBottom:0 }}>
          <button className={`tab ${view==='kanban'?'active':''}`} onClick={() => setView('kanban')}>Kanban</button>
          <button className={`tab ${view==='list'?'active':''}`} onClick={() => setView('list')}>List</button>
          <button className={`tab ${view==='members'?'active':''}`} onClick={() => setView('members')}>Members</button>
        </div>
        <span className="text-sm text-muted">{tasks.length} tasks total</span>
      </div>

      {/* Kanban */}
      {view === 'kanban' && (
        <div className="kanban">
          {COLS.map(col => (
            <div key={col} className="kanban-col">
              <div className="kanban-header">
                <span className="kanban-title" style={{ color: COL_COLORS[col] }}>{COL_LABELS[col]}</span>
                <span className="kanban-count">{colTasks(col).length}</span>
              </div>
              {colTasks(col).map(t => {
                const overdue = t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done'
                return (
                  <div key={t._id} className={`task-card ${overdue ? 'overdue' : ''}`} onClick={() => { if (isMember) { setEditTask(t); setShowTaskModal(true) } }}>
                    <div className="flex items-center gap-2" style={{ justifyContent:'space-between', marginBottom:6 }}>
                      <span className={`badge badge-${t.priority}`}>{t.priority}</span>
                      {isProjectAdmin && (
                        <button className="icon-btn" style={{ color:'var(--danger)', padding:2 }} onClick={e => handleDeleteTask(t._id, e)}><Trash2 size={13} /></button>
                      )}
                    </div>
                    <p className="task-title">{t.title}</p>
                    {t.assignee && <p className="text-xs text-muted" style={{ marginTop:4 }}>👤 {t.assignee.name}</p>}
                    {t.dueDate && <p className={`task-due ${overdue ? 'overdue' : ''}`} style={{ marginTop:6 }}>📅 {new Date(t.dueDate).toLocaleDateString()}</p>}
                    {isMember && (
                      <div style={{ display:'flex', gap:4, marginTop:8, flexWrap:'wrap' }}>
                        {COLS.filter(c => c !== col).map(c => (
                          <button key={c} className="btn btn-ghost btn-sm" style={{ padding:'2px 7px', fontSize:11 }}
                            onClick={e => { e.stopPropagation(); handleStatusChange(t._id, c) }}>→ {COL_LABELS[c]}</button>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
              {isMember && (
                <button className="btn btn-ghost btn-sm w-full" style={{ marginTop:4 }}
                  onClick={() => { setEditTask(null); setShowTaskModal(true) }}>
                  <Plus size={14} /> Add task
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* List view */}
      {view === 'list' && (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Task</th><th>Assignee</th><th>Status</th><th>Priority</th><th>Due</th><th>Actions</th></tr></thead>
            <tbody>
              {tasks.length === 0 && <tr><td colSpan={6} style={{ textAlign:'center', color:'var(--text3)', padding:32 }}>No tasks yet</td></tr>}
              {tasks.map(t => {
                const overdue = t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done'
                return (
                  <tr key={t._id}>
                    <td><span style={{ fontWeight:600 }}>{t.title}</span>{overdue && <span style={{ color:'var(--danger)', fontSize:11, marginLeft:6 }}>OVERDUE</span>}</td>
                    <td className="text-sm">{t.assignee?.name || <span className="text-muted">Unassigned</span>}</td>
                    <td>
                      <select className="filter-select" value={t.status} onChange={e => handleStatusChange(t._id, e.target.value)} style={{ fontSize:12 }}>
                        {COLS.map(s => <option key={s} value={s}>{COL_LABELS[s]}</option>)}
                      </select>
                    </td>
                    <td><span className={`badge badge-${t.priority}`}>{t.priority}</span></td>
                    <td className="text-sm text-muted">{t.dueDate ? new Date(t.dueDate).toLocaleDateString() : '—'}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        {isMember && <button className="icon-btn" onClick={() => { setEditTask(t); setShowTaskModal(true) }}>✏️</button>}
                        {isProjectAdmin && <button className="icon-btn" style={{ color:'var(--danger)' }} onClick={e => handleDeleteTask(t._id, e)}><Trash2 size={14} /></button>}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Members view */}
      {view === 'members' && (
        <div>
          {isProjectAdmin && (
            <div className="card" style={{ marginBottom:20 }}>
              <h3 style={{ marginBottom:14, fontSize:14, fontWeight:700 }}>Add Member</h3>
              <div className="flex items-center gap-2">
                <input className="form-input" placeholder="Member email address" value={memberEmail}
                  onChange={e => setMemberEmail(e.target.value)} style={{ flex:1 }} />
                <button className="btn btn-primary" onClick={handleAddMember}><UserPlus size={16} />Add</button>
              </div>
            </div>
          )}
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {project.members?.map(m => (
              <div key={m.user?._id} className="card" style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 20px' }}>
                <div className="avatar avatar-lg">{m.user?.name?.slice(0,2).toUpperCase()}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:600 }}>{m.user?.name}</div>
                  <div className="text-sm text-muted">{m.user?.email}</div>
                </div>
                <span className={`badge badge-${m.role}`}>{m.role}</span>
                {m.user?.name === project.owner?.name && <span className="badge badge-admin">Owner</span>}
                {isProjectAdmin && m.user?._id !== project.owner?._id && (
                  <button className="btn btn-danger btn-sm" onClick={() => handleRemoveMember(m.user?._id)}>Remove</button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {showTaskModal && (
        <TaskModal projectId={id} members={project.members || []} task={editTask}
          onClose={() => { setShowTaskModal(false); setEditTask(null) }} onSave={handleTaskSave} />
      )}
    </div>
  )
}
