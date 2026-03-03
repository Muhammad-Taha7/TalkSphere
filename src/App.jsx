import React, { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthModel } from './Auth/AuthModel'
import { AuthProvider } from './Auth/AuthContext'
import { ProtectedRoute } from './Auth/ProtectedRoute'
import { PublicRoute } from './Auth/PublicRoute'
import { Error } from './Error/Error'
import { Talksphere } from './Pages/Talksphere'
import { Profile } from './Pages/Profile'

const LoadingScreen = () => (
  <div className="flex min-h-screen w-full items-center justify-center bg-white">
    <div className="text-center">
      <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" />
      <p className="text-xs font-medium uppercase tracking-[0.35em] text-slate-400">Loading</p>
    </div>
  </div>
)

export const App = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            <Route path="/" element={<Navigate to="/auth" replace />} />
            <Route
              path="/auth"
              element={
                <PublicRoute>
                  <AuthModel />
                </PublicRoute>
              }
            />
            <Route
              path="/talksphere"
              element={
                <ProtectedRoute>
                  <Talksphere />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Error />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  )
}
