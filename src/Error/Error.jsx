import React from 'react'
import { Link } from 'react-router-dom'

export const Error = () => {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 px-6">
      <div className="animate-fade-in mx-auto max-w-md text-center">
        {/* Illustration */}
        <div className="mx-auto mb-6 flex h-28 w-28 items-center justify-center rounded-3xl bg-indigo-50">
          <svg className="h-14 w-14 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>

        {/* Error code */}
        <div className="text-8xl font-extrabold tracking-tight text-slate-200">404</div>

        {/* Brand */}
        <p className="mt-2 text-xs font-bold uppercase tracking-[0.4em] text-indigo-500">TalkSphere</p>

        {/* Title & description */}
        <h1 className="mt-5 text-2xl font-bold text-slate-800">Page not found</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          The page you're looking for doesn't exist or has been moved. Let's get you back on track.
        </p>

        {/* Action */}
        <Link
          to="/"
          className="mt-8 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-700 hover:shadow-indigo-500/30 active:scale-[0.98]"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to TalkSphere
        </Link>
      </div>
    </div>
  )
}
