import { useEffect, useState } from 'react'
import { UserPlus, Pencil, Trash2, RotateCcw, Search, Mail, Shield } from 'lucide-react'
import AppLayout from '../../components/layout/AppLayout.jsx'
import Button from '../../components/common/Button.jsx'
import Input  from '../../components/common/Input.jsx'
import Modal, { ConfirmModal } from '../../components/common/Modal.jsx'
import { adminService } from '../../services/adminService.js'
import { getInitials, formatTimestamp } from '../../utils/helpers.js'
import { SkeletonCard } from '../../components/common/Loader.jsx'
import toast from 'react-hot-toast'

const EMPTY_FORM = { name: '', email: '', department: '', password: '' }

function FacultyRow({ member, onEdit, onDelete, onReset }) {
  return (
    <tr className="border-b border-gray-50 hover:bg-gray-50/40 transition-colors group">
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-crimson-100 text-crimson-700 flex items-center justify-center text-xs font-semibold shrink-0">
            {getInitials(member.name)}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 font-sans">{member.name}</p>
            <p className="text-xs text-gray-400 font-sans">{member.email}</p>
          </div>
        </div>
      </td>
      <td className="px-5 py-3.5 hidden md:table-cell">
        <span className="text-sm text-gray-600 font-sans">{member.department || '—'}</span>
      </td>
      <td className="px-5 py-3.5 hidden lg:table-cell">
        <span className={`text-xs px-2.5 py-1 rounded-full font-sans font-medium border ${
          member.active !== false ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'
        }`}>
          {member.active !== false ? 'Active' : 'Inactive'}
        </span>
      </td>
      <td className="px-5 py-3.5 hidden lg:table-cell">
        <span className="text-xs text-gray-400 font-sans">{formatTimestamp(member.createdAt)}</span>
      </td>
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
          <button onClick={() => onEdit(member)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-crimson-700 hover:bg-crimson-50 transition-colors" title="Edit">
            <Pencil size={14}/>
          </button>
          <button onClick={() => onReset(member)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Reset password">
            <RotateCcw size={14}/>
          </button>
          <button onClick={() => onDelete(member)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Delete">
            <Trash2 size={14}/>
          </button>
        </div>
      </td>
    </tr>
  )
}

function FacultyModal({ open, onClose, initial, onSaved }) {
  const isEdit = !!initial?.id
  const [form,    setForm]    = useState(initial || EMPTY_FORM)
  const [loading, setLoading] = useState(false)
  const [errors,  setErrors]  = useState({})

  useEffect(() => { setForm(initial || EMPTY_FORM); setErrors({}) }, [initial, open])

  const validate = () => {
    const e = {}
    if (!form.name.trim())  e.name  = 'Name is required'
    if (!form.email.trim()) e.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email'
    if (!isEdit && !form.password) e.password = 'Password is required'
    setErrors(e)
    return !Object.keys(e).length
  }

  const save = async () => {
    if (!validate()) return
    setLoading(true)
    try {
      if (isEdit) {
        await adminService.updateFaculty(initial.id, { name: form.name, department: form.department })
        toast.success('Faculty updated.')
      } else {
        await adminService.createFaculty(form)
        toast.success('Faculty account created.')
      }
      onSaved()
      onClose()
    } catch (err) {
      toast.error(err.message || 'Operation failed.')
    } finally {
      setLoading(false)
    }
  }

  const f = (key) => ({ value: form[key], onChange: e => setForm(p => ({ ...p, [key]: e.target.value })), error: errors[key] })

  return (
    <Modal
      open={open} onClose={onClose}
      title={isEdit ? 'Edit Faculty' : 'Add Faculty Member'}
      subtitle={isEdit ? 'Update faculty account details' : 'Create a new faculty account'}
      size="sm"
      footer={<>
        <Button variant="secondary" size="sm" onClick={onClose} disabled={loading}>Cancel</Button>
        <Button size="sm" loading={loading} onClick={save}>{isEdit ? 'Save changes' : 'Create account'}</Button>
      </>}
    >
      <div className="space-y-4">
        <Input label="Full name"   {...f('name')}       placeholder="Dr. Jane Smith" />
        <Input label="Email"       {...f('email')}      placeholder="jane@institution.edu" type="email" disabled={isEdit} />
        <Input label="Department"  {...f('department')} placeholder="Computer Science (optional)" />
        {!isEdit && <Input label="Temporary password" {...f('password')} type="password" placeholder="They'll be prompted to change it" />}
      </div>
    </Modal>
  )
}

export default function ManageFaculty() {
  const [faculty,  setFaculty]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [modal,    setModal]    = useState(null)  // null | { mode:'add'|'edit', data? }
  const [confirm,  setConfirm]  = useState(null)  // { action:'delete'|'reset', member }
  const [cLoading, setCLoading] = useState(false)

  const load = () => {
    setLoading(true)
    adminService.getFaculty()
      .then(r => setFaculty(r.data || []))
      .catch(() => toast.error('Failed to load faculty.'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const filtered = faculty.filter(m =>
    m.name?.toLowerCase().includes(search.toLowerCase()) ||
    m.email?.toLowerCase().includes(search.toLowerCase()) ||
    m.department?.toLowerCase().includes(search.toLowerCase())
  )

  const handleConfirm = async () => {
    if (!confirm) return
    setCLoading(true)
    try {
      if (confirm.action === 'delete') {
        await adminService.deleteFaculty(confirm.member.id)
        toast.success('Faculty member removed.')
        setFaculty(prev => prev.filter(m => m.id !== confirm.member.id))
      } else {
        await adminService.resetFacultyPwd(confirm.member.id)
        toast.success('Password reset email sent.')
      }
    } catch (err) {
      toast.error(err.message || 'Action failed.')
    } finally {
      setCLoading(false)
      setConfirm(null)
    }
  }

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs text-gray-400 font-sans uppercase tracking-widest mb-1">Admin</p>
            <h1 className="font-display text-3xl font-semibold text-gray-900">Manage Faculty</h1>
            <p className="text-sm text-gray-500 font-sans mt-1">
              {faculty.length} faculty account{faculty.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Button onClick={() => setModal({ mode: 'add' })} icon={<UserPlus size={15}/>} size="md">
            Add Faculty
          </Button>
        </div>

        {/* Search */}
        <Input
          placeholder="Search by name, email, or department…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          icon={<Search size={15}/>}
        />

        {/* Table */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-card overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-3">{[...Array(4)].map((_,i) => <SkeletonCard key={i}/>)}</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 flex flex-col items-center gap-3">
              <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center">
                <Shield size={20} className="text-gray-300"/>
              </div>
              <p className="text-sm text-gray-400 font-sans">
                {search ? 'No faculty match your search.' : 'No faculty accounts yet.'}
              </p>
              {!search && (
                <Button size="sm" variant="secondary" onClick={() => setModal({ mode: 'add' })}>Add first faculty member</Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['Faculty Member', 'Department', 'Status', 'Joined', ''].map(h => (
                      <th key={h} className={`px-5 py-3 text-left text-xs font-semibold uppercase tracking-widest text-gray-400 font-sans ${
                        h === 'Department' ? 'hidden md:table-cell' :
                        h === 'Status' || h === 'Joined' ? 'hidden lg:table-cell' : ''
                      }`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(m => (
                    <FacultyRow
                      key={m.id} member={m}
                      onEdit={m => setModal({ mode: 'edit', data: m })}
                      onDelete={m => setConfirm({ action: 'delete', member: m })}
                      onReset={m => setConfirm({ action: 'reset',  member: m })}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit modal */}
      <FacultyModal
        open={!!modal}
        onClose={() => setModal(null)}
        initial={modal?.mode === 'edit' ? modal.data : null}
        onSaved={load}
      />

      {/* Confirm modals */}
      <ConfirmModal
        open={confirm?.action === 'delete'}
        onClose={() => setConfirm(null)}
        onConfirm={handleConfirm}
        loading={cLoading}
        title="Remove faculty member?"
        message={`This will permanently delete ${confirm?.member?.name}'s account. This action cannot be undone.`}
        confirmLabel="Remove"
      />
      <ConfirmModal
        open={confirm?.action === 'reset'}
        onClose={() => setConfirm(null)}
        onConfirm={handleConfirm}
        loading={cLoading}
        title="Reset password?"
        message={`A password reset link will be sent to ${confirm?.member?.email}.`}
        confirmLabel="Send reset"
      />
    </AppLayout>
  )
}
