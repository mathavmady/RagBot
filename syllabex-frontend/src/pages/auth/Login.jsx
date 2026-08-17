import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useGoogleLogin } from '@react-oauth/google'
import { Eye, EyeOff, Lock, Mail, BookOpen, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../hooks/useAuth.js'
import { getHomeRoute } from '../../utils/roleUtils.js'
import { ROUTES } from '../../utils/constants.js'
import Button from '../../components/common/Button.jsx'
import Input  from '../../components/common/Input.jsx'

export default function Login() {
  const { user, login, loginGoogle } = useAuth()
  const navigate = useNavigate()

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPwd,  setShowPwd]  = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [gLoading, setGLoading] = useState(false)
  const [error,    setError]    = useState('')

  if (user) return <Navigate to={getHomeRoute(user.role)} replace />

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!email || !password) { setError('Please enter your email and password.'); return }
    setError('')
    setLoading(true)
    try {
      const u = await login(email, password)
      toast.success(`Welcome back, ${u.name?.split(' ')[0] || 'there'}!`)
      navigate(getHomeRoute(u.role))
    } catch (err) {
      setError(err.message || 'Invalid credentials. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setGLoading(true)
      try {
        const response = await loginGoogle(tokenResponse.access_token)
        const result = response.data || response  
        console.log("Google login result:", result)
        if (result?.requiresPasswordSetup) {
         sessionStorage.setItem("setupEmail", result.user?.email)
sessionStorage.setItem("setupToken", result.temporaryToken)

navigate(ROUTES.SET_PASSWORD)
          return
        }
        toast.success(`Welcome, ${result.name?.split(' ')[0] || 'there'}!`)
        navigate(getHomeRoute(result.role))
      } catch (err) {
        toast.error(err.message || 'Google login failed.')
      } finally {
        setGLoading(false)
      }
    },
    onError: () => toast.error('Google sign-in was cancelled.'),
  })

  return (
    <div className="min-h-screen flex bg-white overflow-hidden">
      {/* Left decorative panel */}
      <div className="hidden lg:flex lg:w-[44%] bg-crimson-700 flex-col justify-between p-12 relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full border border-white/60"
              style={{
                width:  `${(i+1) * 120}px`,
                height: `${(i+1) * 120}px`,
                top:    '50%',
                left:   '50%',
                transform: 'translate(-50%, -50%)',
              }}
            />
          ))}
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-crimson-600 rounded-full -translate-y-1/2 translate-x-1/2 opacity-40" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-crimson-900 rounded-full translate-y-1/3 -translate-x-1/3 opacity-50" />

        {/* Top logo */}
        <div className="relative flex items-center gap-3">
          <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center">
            <BookOpen size={18} className="text-crimson-700" />
          </div>
          <span className="font-display text-2xl text-white font-semibold">Syllabex</span>
        </div>

        {/* Centre content */}
        <div className="relative">
          <div className="inline-block bg-white/10 border border-white/20 rounded-2xl px-4 py-2 mb-6">
            <span className="text-white/80 text-xs font-sans uppercase tracking-widest">
              Intelligent Study Assistant
            </span>
          </div>
          <h1 className="font-display text-5xl font-light text-white leading-tight mb-6">
            Learn smarter.<br />
            <em>Not harder.</em>
          </h1>
          <p className="text-white/70 font-sans text-base leading-relaxed max-w-sm">
            Get concept-clear answers from your institution's approved study materials.
            No hallucinations. No off-syllabus content.
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-2 mt-8">
            {['RAG-Powered', 'Syllabus-Grounded', 'Role-Based Access', 'Source Citations'].map(f => (
              <span key={f} className="bg-white/10 border border-white/20 text-white/90 text-xs font-sans px-3 py-1.5 rounded-full">
                {f}
              </span>
            ))}
          </div>
        </div>

        {/* Bottom text */}
        <div className="relative">
          <p className="text-white/40 text-xs font-sans">
            © 2025 Syllabex · KNCET · Powered by Qwen3 + Pinecone + Groq
          </p>
        </div>
      </div>

      {/* Right: login form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[400px] animate-fade-up">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-crimson-700 rounded-lg flex items-center justify-center">
              <BookOpen size={16} className="text-white" />
            </div>
            <span className="font-display text-xl font-semibold text-gray-900">Syllabex</span>
          </div>

          <h2 className="font-display text-3xl font-semibold text-gray-900 mb-1">
            Sign in
          </h2>
          <p className="text-sm text-gray-500 font-sans mb-8">
            Access your personalised learning assistant
          </p>

          {/* Error alert */}
          {error && (
            <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 text-sm font-sans px-4 py-3 rounded-xl mb-5 animate-fade-in">
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Google button */}
          <Button
            variant="secondary"
            fullWidth
            size="lg"
            loading={gLoading}
            onClick={() => handleGoogle()}
            className="mb-5 !font-sans"
            icon={
              !gLoading && (
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )
            }
          >
            Continue with Google
          </Button>

          {/* Divider */}
          <div className="relative flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-xs text-gray-400 font-sans uppercase tracking-wider">or</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          {/* Email/password form */}
          <form onSubmit={handleLogin} className="space-y-4" noValidate>
            <Input
              label="Email address"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@institution.edu"
              autoComplete="email"
              icon={<Mail size={15}/>}
              size="lg"
            />
            <Input
              label="Password"
              type={showPwd ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              icon={<Lock size={15}/>}
              iconRight={
                <button
                  type="button"
                  onClick={() => setShowPwd(p => !p)}
                  className="text-gray-400 hover:text-gray-700 transition-colors"
                  tabIndex={-1}
                >
                  {showPwd ? <EyeOff size={15}/> : <Eye size={15}/>}
                </button>
              }
              size="lg"
            />

            <Button
              type="submit"
              fullWidth
              size="lg"
              loading={loading ? 'Signing in…' : false}
              className="mt-2 !font-sans"
            >
              Sign in
            </Button>
          </form>

          {/* Info note */}
          <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
            <p className="text-xs text-gray-500 font-sans leading-relaxed">
              <strong className="text-gray-700">Students</strong> sign in with Google · 
              &nbsp;<strong className="text-gray-700">Faculty & Admins</strong> use email credentials provided by your administrator.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
