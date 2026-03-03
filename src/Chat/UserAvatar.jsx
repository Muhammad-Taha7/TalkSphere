import React, { useState, memo } from 'react'

const COLORS = [
  'bg-amber-500',
  'bg-rose-500',
  'bg-cyan-500',
  'bg-violet-500',
  'bg-emerald-500',
  'bg-pink-500',
  'bg-sky-500',
  'bg-orange-500',
]

const getColor = (name) => {
  let hash = 0
  const str = name || ''
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  return COLORS[Math.abs(hash) % COLORS.length]
}

const getInitials = (name) => {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

export const UserAvatar = memo(({ name, photoURL, size = 40, online }) => {
  const [imgError, setImgError] = useState(false)
  const colorClass = getColor(name)
  const initials = getInitials(name)

  const showImage = photoURL && !imgError

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      {showImage ? (
        <img
          src={photoURL}
          alt={name || 'User'}
          className="h-full w-full rounded-full object-cover ring-2 ring-white"
          onError={() => setImgError(true)}
          loading="lazy"
          draggable={false}
        />
      ) : (
        <div
          className={`${colorClass} flex h-full w-full items-center justify-center rounded-full font-bold text-white ring-2 ring-white`}
          style={{ fontSize: size * 0.36 }}
        >
          {initials}
        </div>
      )}
      {online !== undefined && (
        <span
          className={`absolute bottom-0 right-0 rounded-full border-2 border-white transition-colors ${
            online ? 'bg-emerald-500' : 'bg-slate-300'
          }`}
          style={{ width: size * 0.28, height: size * 0.28, minWidth: 8, minHeight: 8 }}
        />
      )}
    </div>
  )
})
