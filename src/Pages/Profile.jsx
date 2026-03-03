import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ref as dbRef, get, update } from 'firebase/database'
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'
import { updateProfile } from 'firebase/auth'
import { rtdb, storage, auth } from '../Auth/Firebase'
import { useAuth } from '../Auth/AuthContext'
import { UserAvatar } from '../Chat/UserAvatar'

const STATUS_PRESETS = [
  { emoji: '👋', text: 'Available' },
  { emoji: '💼', text: 'At work' },
  { emoji: '🔴', text: 'Busy' },
  { emoji: '🌙', text: 'Away' },
  { emoji: '🎮', text: 'Gaming' },
  { emoji: '☕', text: 'On a break' },
]

export const Profile = () => {
  const { user, updateStatus, deleteStatus } = useAuth()
  const navigate = useNavigate()

  const [displayName, setDisplayName] = useState('')
  const [photoURL, setPhotoURL] = useState('')
  const [email, setEmail] = useState('')
  const [statusText, setStatusText] = useState('')
  const [currentStatus, setCurrentStatus] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [savingStatus, setSavingStatus] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user?.uid) return
    setEmail(user.email || '')
    setDisplayName(user.displayName || '')
    setPhotoURL(user.photoURL || '')

    // Fetch latest from RTDB including status
    get(dbRef(rtdb, `users/${user.uid}`)).then((snap) => {
      if (snap.exists()) {
        const data = snap.val()
        setDisplayName(data.displayName || user.displayName || '')
        setPhotoURL(data.photoURL || user.photoURL || '')
        setStatusText(data.statusText || '')
        setCurrentStatus(data.statusText || '')
      }
    }).catch(() => {})
  }, [user])

  const showSuccess = (msg) => {
    setSuccess(msg)
    setTimeout(() => setSuccess(''), 3000)
  }

  const handleSave = async () => {
    if (!displayName.trim()) {
      setError('Display name cannot be empty')
      return
    }
    if (displayName.trim().length < 2) {
      setError('Display name must be at least 2 characters')
      return
    }
    setSaving(true)
    setError('')
    try {
      await updateProfile(auth.currentUser, { displayName: displayName.trim(), photoURL })
      await update(dbRef(rtdb, `users/${user.uid}`), {
        displayName: displayName.trim(),
        searchName: displayName.trim().toLowerCase(),
        photoURL,
      })
      showSuccess('Profile updated successfully!')
    } catch (err) {
      setError(err.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be under 5MB')
      return
    }

    setUploading(true)
    setError('')
    try {
      const path = `profile_pictures/${user.uid}/${Date.now()}_${file.name}`
      const sRef = storageRef(storage, path)
      await uploadBytes(sRef, file)
      const url = await getDownloadURL(sRef)
      setPhotoURL(url)
      await updateProfile(auth.currentUser, { photoURL: url })
      await update(dbRef(rtdb, `users/${user.uid}`), { photoURL: url })
      showSuccess('Profile picture updated!')
    } catch (err) {
      setError(err.message || 'Failed to upload photo')
    } finally {
      setUploading(false)
    }
  }

  const handleSaveStatus = async () => {
    setSavingStatus(true)
    setError('')
    try {
      await updateStatus(statusText)
      setCurrentStatus(statusText)
      showSuccess('Status updated!')
    } catch (err) {
      setError(err.message || 'Failed to update status')
    } finally {
      setSavingStatus(false)
    }
  }

  const handleDeleteStatus = async () => {
    setSavingStatus(true)
    setError('')
    try {
      await deleteStatus()
      setStatusText('')
      setCurrentStatus('')
      showSuccess('Status removed!')
    } catch (err) {
      setError(err.message || 'Failed to remove status')
    } finally {
      setSavingStatus(false)
    }
  }

  const handlePresetStatus = (preset) => {
    setStatusText(`${preset.emoji} ${preset.text}`)
  }

  return (
    <div className="flex min-h-screen items-start justify-center bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 px-4 py-8 sm:items-center sm:py-16">
      <div className="w-full max-w-lg animate-fade-in">
        {/* Back button */}
        <button
          onClick={() => navigate('/talksphere')}
          className="mb-5 flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-indigo-600"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Back to chats
        </button>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="mb-1 text-xl font-bold text-slate-800">Your Profile</h1>
          <p className="mb-7 text-sm text-slate-400">Manage your account and status</p>

          {/* ── Avatar ── */}
          <div className="mb-8 flex flex-col items-center gap-4">
            <div className="relative">
              {photoURL ? (
                <img
                  src={photoURL}
                  alt="Profile"
                  className="h-24 w-24 rounded-full object-cover ring-4 ring-indigo-50"
                />
              ) : (
                <UserAvatar name={displayName || email} size={96} />
              )}
              <label className="absolute -bottom-1 -right-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg transition hover:bg-indigo-700 active:scale-90">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoUpload}
                  disabled={uploading}
                />
                {uploading ? (
                  <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                  </svg>
                )}
              </label>
            </div>
            <p className="text-[11px] text-slate-400">Tap camera to change photo</p>
          </div>

          {/* ── Email (read-only) ── */}
          <div className="mb-4">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">
              Email
            </label>
            <input
              type="email"
              value={email}
              disabled
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-500 outline-none"
            />
          </div>

          {/* ── Display Name ── */}
          <div className="mb-6">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter your name"
              maxLength={30}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 outline-none placeholder:text-slate-400 transition focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          {/* Divider */}
          <div className="mb-6 border-t border-slate-100" />

          {/* ── Status Section ── */}
          <div className="mb-6">
            <div className="mb-3 flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Status
              </label>
              {currentStatus && (
                <button
                  onClick={handleDeleteStatus}
                  disabled={savingStatus}
                  className="flex items-center gap-1 text-[11px] font-medium text-red-500 transition hover:text-red-600 disabled:text-slate-300"
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                  Remove
                </button>
              )}
            </div>

            {currentStatus && (
              <div className="mb-3 flex items-center gap-2 rounded-xl bg-indigo-50 px-4 py-2.5">
                <span className="text-sm text-indigo-700">{currentStatus}</span>
              </div>
            )}

            <input
              type="text"
              value={statusText}
              onChange={(e) => setStatusText(e.target.value)}
              placeholder="What's on your mind?"
              maxLength={150}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 outline-none placeholder:text-slate-400 transition focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100"
            />
            <div className="mt-1.5 flex items-center justify-between">
              <p className="text-[11px] text-slate-400">
                {statusText.length}/150
              </p>
            </div>

            {/* Preset statuses */}
            <div className="mt-3 flex flex-wrap gap-2">
              {STATUS_PRESETS.map((preset) => (
                <button
                  key={preset.text}
                  type="button"
                  onClick={() => handlePresetStatus(preset)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 active:scale-95"
                >
                  {preset.emoji} {preset.text}
                </button>
              ))}
            </div>

            <button
              onClick={handleSaveStatus}
              disabled={savingStatus || statusText === currentStatus}
              className="mt-3 w-full rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-semibold text-indigo-600 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400"
            >
              {savingStatus ? 'Saving...' : 'Update Status'}
            </button>
          </div>

          {/* ── Messages ── */}
          {error && (
            <div className="mb-4 rounded-xl bg-red-50 px-4 py-2.5 text-xs font-medium text-red-600">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 rounded-xl bg-emerald-50 px-4 py-2.5 text-xs font-medium text-emerald-600">
              {success}
            </div>
          )}

          {/* ── Save Profile ── */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
          >
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </div>
    </div>
  )
}
