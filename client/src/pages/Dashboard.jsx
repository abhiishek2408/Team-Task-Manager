import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDashboard } from '../api/api'
import { useAuth } from '../context/AuthContext'
import { AlertTriangle, CheckCircle2, Clock, FolderOpen, ListTodo, Loader2 } from 'lucide-react'

const statusLabel = { todo: 'To Do', 'in-progress': 'In Progress', review: 'Review', done: 'Done' }
const priorityColors = { low: '#64748b', medium: '#0284c7', high: '#d97706', critical: '#dc2626' }

function StatCard({ icon: Icon, label, value, color, sub }) {
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ background: `${color}15`, border: `1px solid ${color}40` }}>
        <Icon size={20} color={color} strokeWidth={2.5} />
      </div>
      <div className="stat-value" style={{ color }}>{value}</div>
      <div className="stat-label">{label}</div>
      {sub && <div className="stat-change">{sub}</div>}
    </div>
  )
}

function TaskRow({ task }) {
  const overdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done'
  return (
    <div className={`task-card ${overdue ? 'overdue' : ''}`} style={{ marginBottom: 8 }}>
      <div className="flex items-center gap-2" style={{ justifyContent: 'space-between' }}>
        <span className="task-title">{task.title}</span>
        <span className={`badge badge-${task.status}`}>{statusLabel[task.status]}</span>
      </div>
      <div className="task-meta" style={{ marginTop: 6 }}>
        <span className={`badge badge-${task.priority}`}>{task.priority}</span>
        {task.project && <span className="text-xs text-muted" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: task.project.color, display: 'inline-block' }} />
          {task.project.name}
        </span>}
        {task.dueDate && (
          <span className={`task-due ${overdue ? 'overdue' : ''}`}>
            <Clock size={11} /> {new Date(task.dueDate).toLocaleDateString()}
          </span>
        )}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDashboard()
      .then(res => setStats(res.data.stats))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center gap-2" style={{ justifyContent: 'center', padding: 80 }}>
      <Loader2 size={28} style={{ animation: 'spin 1s linear infinite' }} />
    </div>
  )

  const { taskCounts = {}, overdueCount = 0, projectCount = 0, overdueTasks = [], recentTasks = [], myTasks = [] } = stats || {}

  return (
    <div>
      <div className="section-header">
        <div>
          <h1 className="section-title">Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {user?.name?.split(' ')[0]} 👋</h1>
          <p className="section-subtitle">Here's what's happening with your projects</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/projects')}>View Projects</button>
      </div>

      <div className="stats-grid">
        <StatCard icon={FolderOpen} label="Projects" value={projectCount} color="#4f46e5" />
        <StatCard icon={ListTodo} label="Total Tasks" value={taskCounts.total || 0} color="#0891b2" />
        <StatCard icon={CheckCircle2} label="Completed" value={taskCounts.done || 0} color="#059669" />
        <StatCard icon={Loader2} label="In Progress" value={taskCounts['in-progress'] || 0} color="#d97706" />
        <StatCard icon={AlertTriangle} label="Overdue" value={overdueCount} color="#dc2626" />
      </div>

      {/* Progress bars */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ marginBottom: 16, fontSize: 15, fontWeight: 700 }}>Task Status Overview</h3>
        {['todo', 'in-progress', 'review', 'done'].map(s => {
          const count = taskCounts[s] || 0
          const pct = taskCounts.total ? Math.round((count / taskCounts.total) * 100) : 0
          const colors = { todo: '#64748b', 'in-progress': '#0284c7', review: '#d97706', done: '#059669' }
          return (
            <div key={s} style={{ marginBottom: 12 }}>
              <div className="flex items-center gap-2" style={{ marginBottom: 4, justifyContent: 'space-between' }}>
                <span className="text-sm">{statusLabel[s]}</span>
                <span className="text-xs text-muted">{count} ({pct}%)</span>
              </div>
              <div className="progress-bar" style={{ height: 6 }}>
                <div className="progress-fill" style={{ width: `${pct}%`, background: colors[s] }} />
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* My Tasks */}
        <div>
          <div className="section-header" style={{ marginBottom: 12 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700 }}>My Tasks</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/tasks')}>View all</button>
          </div>
          {myTasks.length === 0
            ? <div className="empty-state" style={{ padding: 30 }}><p className="text-muted text-sm">No tasks assigned to you</p></div>
            : myTasks.map(t => <TaskRow key={t._id} task={t} />)
          }
        </div>

        {/* Overdue Tasks */}
        <div>
          <div className="section-header" style={{ marginBottom: 12 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: overdueCount ? 'var(--danger)' : 'inherit' }}>
              {overdueCount > 0 && <AlertTriangle size={16} style={{ display: 'inline', marginRight: 6 }} />}
              Overdue Tasks
            </h3>
          </div>
          {overdueTasks.length === 0
            ? <div className="empty-state" style={{ padding: 30 }}><p className="text-muted text-sm">No overdue tasks 🎉</p></div>
            : overdueTasks.map(t => <TaskRow key={t._id} task={t} />)
          }
        </div>
      </div>

      {/* Recent Activity */}
      {recentTasks.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Recent Tasks</h3>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Task</th><th>Project</th><th>Status</th><th>Priority</th><th>Due</th></tr></thead>
              <tbody>
                {recentTasks.map(t => (
                  <tr key={t._id}>
                    <td style={{ fontWeight: 500 }}>{t.title}</td>
                    <td>
                      <span className="flex items-center gap-2">
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: t.project?.color, display: 'inline-block' }} />
                        {t.project?.name}
                      </span>
                    </td>
                    <td><span className={`badge badge-${t.status}`}>{statusLabel[t.status]}</span></td>
                    <td><span className={`badge badge-${t.priority}`}>{t.priority}</span></td>
                    <td className="text-sm text-muted">{t.dueDate ? new Date(t.dueDate).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
