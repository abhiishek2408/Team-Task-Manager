import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { getUsers, updateUserRole, deactivateUser } from '../api/api'
import { useAuth } from '../context/AuthContext'
import { Loader2, Shield, UserX } from 'lucide-react'

export default function Team() {
  const { user: me, isAdmin } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const load = () => {
    getUsers(search || undefined).then(r => setUsers(r.data.users)).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t) }, [search])

  const handleRole = async (id, role) => {
    try {
      const res = await updateUserRole(id, role)
      setUsers(prev => prev.map(u => u._id === id ? res.data.user : u))
      toast.success('Role updated')
    } catch (err) { toast.error(err.response?.data?.message || 'Failed') }
  }

  const handleDeactivate = async (id) => {
    if (!confirm('Deactivate this user?')) return
    try {
      await deactivateUser(id)
      setUsers(prev => prev.filter(u => u._id !== id))
      toast.success('User deactivated')
    } catch (err) { toast.error(err.response?.data?.message || 'Failed') }
  }

  return (
    <div>
      <div className="section-header">
        <div>
          <h1 className="section-title">Team</h1>
          <p className="section-subtitle">Manage team members and roles</p>
        </div>
      </div>
      <div style={{ marginBottom:16 }}>
        <input className="form-input" placeholder="Search by name or email..." value={search}
          onChange={e => setSearch(e.target.value)} style={{ maxWidth:340 }} />
      </div>
      {loading ? (
        <div style={{ display:'flex', justifyContent:'center', padding:60 }}><Loader2 size={28} style={{ animation:'spin 1s linear infinite' }} /></div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Member</th><th>Email</th><th>Role</th><th>Joined</th>{isAdmin && <th>Actions</th>}</tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u._id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="avatar">{u.name?.slice(0,2).toUpperCase()}</div>
                      <span style={{ fontWeight:600 }}>{u.name}</span>
                      {u._id === me._id && <span className="badge badge-admin" style={{ fontSize:10 }}>You</span>}
                    </div>
                  </td>
                  <td className="text-sm text-muted">{u.email}</td>
                  <td>
                    {isAdmin && u._id !== me._id ? (
                      <select className="filter-select" value={u.role}
                        onChange={e => handleRole(u._id, e.target.value)} style={{ fontSize:13 }}>
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                      </select>
                    ) : (
                      <span className={`badge badge-${u.role}`}>{u.role}</span>
                    )}
                  </td>
                  <td className="text-sm text-muted">{new Date(u.createdAt).toLocaleDateString()}</td>
                  {isAdmin && (
                    <td>
                      {u._id !== me._id && (
                        <button className="btn btn-danger btn-sm" onClick={() => handleDeactivate(u._id)}>
                          <UserX size={14} /> Deactivate
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
