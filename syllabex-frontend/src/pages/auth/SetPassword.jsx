import { useState } from 'react'
import { useNavigate, useLocation, Navigate } from 'react-router-dom'
import { Lock, Eye, EyeOff, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { authService } from '../../services/authService.js'
import { ROUTES } from '../../utils/constants.js'
import Button from '../../components/common/Button.jsx'
import Input  from '../../components/common/Input.jsx'

const rules = [
  { id: 'len',   label: 'At least 8 characters',  test: (v) => v.length >= 8 },
  { id: 'upper', label: 'One uppercase letter',    test: (v) => /[A-Z]/.test(v) },
  { id: 'lower', label: 'One lowercase letter',    test: (v) => /[a-z]/.test(v) },
  { id: 'num',   label: 'One number',              test: (v) => /\d/.test(v) },
]

export default function SetPassword() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const email = sessionStorage.getItem("setupEmail")
const temporaryToken = sessionStorage.getItem("setupToken")

  const [password,  setPassword]  = useState('')
  const [confirm,   setConfirm]   = useState('')
  const [showPwd,   setShowPwd]   = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')

  if (!email || !temporaryToken) return <Navigate to={ROUTES.LOGIN} replace />

  const passedRules = rules.filter(r => r.test(password))
  const allPassed   = passedRules.length === rules.length
  const matches     = password === confirm

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!allPassed) { setError('Password does not meet all requirements.'); return }
    if (!matches)   { setError('Passwords do not match.'); return }
    setError('')
    setLoading(true)
    try {
      await authService.setPassword(email, password, temporaryToken)
      toast.success('Password set! You can now log in.')
      navigate(ROUTES.LOGIN)
    } catch (err) {
      setError(err.message || 'Failed to set password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-6">
      <div className="w-full max-w-md animate-fade-up">
        {/* Card */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-card p-8">
          <div className="w-12 h-12 bg-crimson-50 border border-crimson-100 rounded-2xl flex items-center justify-center mb-6">
            <Lock size={20} className="text-crimson-700" />
          </div>
          <h1 className="font-display text-2xl font-semibold text-gray-900 mb-1">
            Set your password
          </h1>
          <p className="text-sm text-gray-500 font-sans mb-2">
            Welcome to Syllabex! Create a password for&nbsp;
            <strong className="text-gray-700">{email}</strong>
          </p>
          <p className="text-xs text-gray-400 font-sans mb-7">
            You'll use this password for future email logins.
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm font-sans px-4 py-3 rounded-xl mb-5">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <Input
              label="New password"
              type={showPwd ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Create a strong password"
              icon={<Lock size={15}/>}
              iconRight={
                <button type="button" onClick={() => setShowPwd(p=>!p)} tabIndex={-1}>
                  {showPwd ? <EyeOff size={15}/> : <Eye size={15}/>}
                </button>
              }
              size="lg"
            />

            {/* Rules */}
            {password && (
              <div className="grid grid-cols-2 gap-1.5 animate-fade-in">
                {rules.map(r => (
                  <div key={r.id} className={`flex items-center gap-1.5 text-xs font-sans transition-colors ${
                    r.test(password) ? 'text-green-600' : 'text-gray-400'
                  }`}>
                    <CheckCircle2 size={12} className={r.test(password) ? 'text-green-500' : 'text-gray-300'} />
                    {r.label}
                  </div>
                ))}
              </div>
            )}

            <Input
              label="Confirm password"
              type={showPwd ? 'text' : 'password'}
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Re-enter your password"
              icon={<Lock size={15}/>}
              error={confirm && !matches ? 'Passwords do not match' : ''}
              size="lg"
            />

            <Button
              type="submit"
              fullWidth
              size="lg"
              loading={loading ? 'Setting password…' : false}
              disabled={!allPassed || !matches || !confirm}
            >
              Set password & continue
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
