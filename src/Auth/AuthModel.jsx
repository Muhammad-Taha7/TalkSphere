import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext'

const initialForm = {
  displayName: '',
  email: '',
  password: '',
}

const PASSWORD_MIN = 6

export const AuthModel = () => {
  const [mode, setMode] = useState('signup') // 'signup' or 'login'
  const [form, setForm] = useState(initialForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate()
  const { signIn, signUp, signInWithGoogle } = useAuth()

  const isSignup = mode === 'signup'
  const title = useMemo(() => (isSignup ? 'Create your space' : 'Welcome back'), [isSignup])
  const subtitle = useMemo(
    () =>
      isSignup
        ? 'Join TalkSphere and start connecting with friends.'
        : 'Sign in to continue your conversations.',
    [isSignup]
  )

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (error) setError('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')

    // Client-side validation
    if (isSignup && !form.displayName.trim()) {
      setError('Please enter your name.')
      setSubmitting(false)
      return
    }
    if (!form.email.trim() || !form.email.includes('@')) {
      setError('Please enter a valid email address.')
      setSubmitting(false)
      return
    }
    if (!form.password || form.password.length < PASSWORD_MIN) {
      setError(`Password must be at least ${PASSWORD_MIN} characters.`)
      setSubmitting(false)
      return
    }

    try {
      if (isSignup) {
        await signUp({
          email: form.email.trim(),
          password: form.password,
          displayName: form.displayName.trim(),
        })
        // After signup, redirect to app
        setForm(initialForm)
        navigate('/talksphere', { replace: true })
      } else {
        await signIn({ email: form.email.trim(), password: form.password })
        setForm(initialForm)
        navigate('/talksphere', { replace: true })
      }
    } catch (err) {
      setError(err?.message || 'Authentication failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleGoogle = async () => {
    setSubmitting(true)
    setError('')

    try {
      await signInWithGoogle()
      navigate('/talksphere', { replace: true })
    } catch (err) {
      setError(err?.message || 'Google sign in failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const switchMode = (newMode) => {
    setMode(newMode)
    setError('')
    setForm(initialForm)
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4 py-10 sm:px-6 sm:py-16">
        <div className="grid w-full gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12">
          {/* ── Left: Brand ── */}
          <div className="hidden space-y-6 lg:block lg:py-8">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600">
                <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                </svg>
              </div>
              <span className="text-sm font-bold tracking-wide text-slate-800">TalkSphere</span>
            </div>

            <h1 className="text-4xl font-extrabold leading-tight text-slate-900 xl:text-5xl">
              {title}
            </h1>
            <p className="max-w-md text-base leading-relaxed text-slate-500">{subtitle}</p>

            {/* Mode toggle */}
            <div className="inline-flex rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
              <button
                type="button"
                onClick={() => switchMode('login')}
                className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition-all ${
                  !isSignup
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => switchMode('signup')}
                className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition-all ${
                  isSignup
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                Sign up
              </button>
            </div>

            {/* Features */}
            <div className="space-y-3 pt-4">
              {[
                { icon: '🔒', text: 'End-to-end secure messaging' },
                { icon: '⚡', text: 'Real-time message delivery' },
                { icon: '👥', text: 'Connect with friends worldwide' },
              ].map((f) => (
                <div key={f.text} className="flex items-center gap-3">
                  <span className="text-lg">{f.icon}</span>
                  <span className="text-sm text-slate-600">{f.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Right: Form ── */}
          <div className="w-full animate-fade-in">
            {/* Mobile brand */}
            <div className="mb-6 text-center lg:hidden">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                </svg>
              </div>
              <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">{title}</h1>
              <p className="mt-1 text-sm text-slate-500">{subtitle}</p>

              {/* Mobile mode toggle */}
              <div className="mt-5 inline-flex rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className={`rounded-xl px-5 py-2 text-sm font-semibold transition ${
                    !isSignup ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500'
                  }`}
                >
                  Login
                </button>
                <button
                  type="button"
                  onClick={() => switchMode('signup')}
                  className={`rounded-xl px-5 py-2 text-sm font-semibold transition ${
                    isSignup ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500'
                  }`}
                >
                  Sign up
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <form onSubmit={handleSubmit} className="space-y-4">
                {isSignup && (
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Full Name
                    </label>
                    <input
                      name="displayName"
                      value={form.displayName}
                      onChange={handleChange}
                      required
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                      placeholder="Enter your full name"
                      autoComplete="name"
                      maxLength={30}
                    />
                  </div>
                )}

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Email Address
                  </label>
                  <input
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                    placeholder="you@email.com"
                    autoComplete="email"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-11 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                      placeholder={isSignup ? 'Min 6 characters' : 'Enter your password'}
                      autoComplete={isSignup ? 'new-password' : 'current-password'}
                      required
                      minLength={PASSWORD_MIN}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((p) => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 transition hover:text-slate-600"
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                        </svg>
                      ) : (
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  {isSignup && form.password.length > 0 && form.password.length < PASSWORD_MIN && (
                    <p className="mt-1.5 text-[11px] text-amber-600">
                      {PASSWORD_MIN - form.password.length} more character{PASSWORD_MIN - form.password.length !== 1 ? 's' : ''} needed
                    </p>
                  )}
                </div>

                {error && (
                  <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                    <svg className="mt-0.5 h-4 w-4 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                    </svg>
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                >
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Please wait...
                    </span>
                  ) : isSignup ? (
                    'Create account'
                  ) : (
                    'Sign in'
                  )}
                </button>

                <div className="flex items-center gap-3 py-1">
                  <span className="h-px flex-1 bg-slate-200" />
                  <span className="text-[11px] font-medium uppercase tracking-[0.15em] text-slate-400">or continue with</span>
                  <span className="h-px flex-1 bg-slate-200" />
                </div>

                <button
                  type="button"
                  onClick={handleGoogle}
                  disabled={submitting}
                  className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:text-slate-400"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  Google
                </button>
              </form>
            </div>

            <p className="mt-4 text-center text-xs text-slate-400">
              By continuing, you agree to TalkSphere's Terms of Service and Privacy Policy.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
