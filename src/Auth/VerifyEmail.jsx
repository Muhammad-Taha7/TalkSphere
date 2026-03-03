import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext'

export const VerifyEmail = () => {
  const { user, resendVerificationEmail, refreshUser, logout } = useAuth()
  const navigate = useNavigate()
  const [resending, setResending] = useState(false)
  const [checking, setChecking] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [cooldown, setCooldown] = useState(0)

  // Auto-check every 5 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const verified = await refreshUser()
        if (verified) {
          navigate('/talksphere', { replace: true })
        }
      } catch { /* ignore */ }
    }, 5000)
    return () => clearInterval(interval)
  }, [refreshUser, navigate])

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  const handleResend = async () => {
    if (cooldown > 0) return
    setResending(true)
    setError('')
    setMessage('')
    try {
      await resendVerificationEmail()
      setMessage('Verification email sent! Check your inbox and spam folder.')
      setCooldown(60)
    } catch (err) {
      setError(err?.message || 'Failed to resend email.')
    } finally {
      setResending(false)
    }
  }

  const handleCheckVerification = async () => {
    setChecking(true)
    setError('')
    setMessage('')
    try {
      const verified = await refreshUser()
      if (verified) {
        navigate('/talksphere', { replace: true })
      } else {
        setError('Email not verified yet. Please click the link in your email first.')
      }
    } catch (err) {
      setError(err?.message || 'Failed to check verification status.')
    } finally {
      setChecking(false)
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/auth', { replace: true })
    } catch { /* ignore */ }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="animate-fade-in w-full max-w-md text-center">
        {/* Icon */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-indigo-50">
          <svg className="h-10 w-10 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
          </svg>
        </div>

        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.35em] text-indigo-500">
          TalkSphere
        </p>
        <h1 className="mb-3 text-2xl font-bold text-slate-900 sm:text-3xl">
          Verify your email
        </h1>
        <p className="mx-auto mb-2 max-w-sm text-sm text-slate-500">
          We've sent a verification link to
        </p>
        <p className="mb-6 text-sm font-semibold text-slate-700">
          {user?.email || 'your email address'}
        </p>

        <div className="mx-auto max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="space-y-4">
            <div className="rounded-xl bg-amber-50 px-4 py-3 text-left">
              <p className="text-xs font-medium text-amber-700">
                Click the link in your email to verify your account. Check your spam folder if you don't see it.
              </p>
            </div>

            {/* Check verification button */}
            <button
              onClick={handleCheckVerification}
              disabled={checking}
              className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {checking ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Checking...
                </span>
              ) : (
                "I've verified my email"
              )}
            </button>

            {/* Resend */}
            <button
              onClick={handleResend}
              disabled={resending || cooldown > 0}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
            >
              {resending
                ? 'Sending...'
                : cooldown > 0
                  ? `Resend in ${cooldown}s`
                  : 'Resend verification email'}
            </button>

            {/* Messages */}
            {message && (
              <div className="rounded-xl bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-600">
                {message}
              </div>
            )}
            {error && (
              <div className="rounded-xl bg-red-50 px-4 py-3 text-xs font-medium text-red-600">
                {error}
              </div>
            )}

            {/* Divider */}
            <div className="flex items-center gap-3 text-xs text-slate-300">
              <span className="h-px flex-1 bg-slate-100" />
              or
              <span className="h-px flex-1 bg-slate-100" />
            </div>

            {/* Sign out */}
            <button
              onClick={handleLogout}
              className="w-full text-center text-xs font-medium text-slate-400 transition hover:text-red-500"
            >
              Sign out and use a different account
            </button>
          </div>
        </div>

        <p className="mt-6 text-[11px] text-slate-400">
          Auto-checking verification status every few seconds...
        </p>
      </div>
    </div>
  )
}
