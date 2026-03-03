import React, { createContext, useContext, useEffect, useMemo } from 'react'
import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth'
import { ref, set, get, update, onDisconnect, serverTimestamp, onValue, query, orderByChild, equalTo } from 'firebase/database'
import { useDispatch, useSelector } from 'react-redux'
import { auth, rtdb, googleProvider } from './Firebase'
import { setUser, setLoading, clearAuth } from '../store/slices/authSlice'

const AuthContext = createContext(null)

/* ───── error translation ───── */

const getAuthErrorMessage = (error) => {
  const code = error?.code || ''
  switch (code) {
    case 'auth/user-not-found': return 'No account found with this email address.'
    case 'auth/wrong-password': return 'Incorrect password. Please try again.'
    case 'auth/invalid-email': return 'Please enter a valid email address.'
    case 'auth/email-already-in-use': return 'This email is already registered. Try logging in instead.'
    case 'auth/weak-password': return 'Password must be at least 6 characters long.'
    case 'auth/too-many-requests': return 'Too many attempts. Please wait a moment and try again.'
    case 'auth/popup-closed-by-user': return 'Sign-in popup was closed. Please try again.'
    case 'auth/invalid-credential': return 'Invalid email or password. Please check and try again.'
    case 'auth/network-request-failed': return 'Network error. Please check your internet connection.'
    case 'auth/operation-not-allowed': return 'This sign-in method is not enabled.'
    case 'auth/requires-recent-login': return 'Please sign in again to complete this action.'
    default: return error?.message || 'Something went wrong. Please try again.'
  }
}

/* ───── helpers ───── */

const serializeUser = (firebaseUser) => {
  if (!firebaseUser) return null
  return {
    uid: firebaseUser.uid,
    displayName: firebaseUser.displayName || '',
    email: firebaseUser.email || '',
    photoURL: firebaseUser.photoURL || '',
    emailVerified: firebaseUser.emailVerified || false,
    provider: firebaseUser.providerData?.[0]?.providerId || 'password',
  }
}

const ensureUniqueDisplayName = async (displayName, ignoreUid = null) => {
  const normalized = (displayName || '').trim().toLowerCase()
  if (!normalized) throw new Error('Display name is required.')
  if (normalized.length < 2) throw new Error('Display name must be at least 2 characters.')
  if (normalized.length > 30) throw new Error('Display name must be under 30 characters.')
  
  try {
    const nameQuery = query(ref(rtdb, 'users'), orderByChild('searchName'), equalTo(normalized))
    const snap = await get(nameQuery)
    if (!snap.exists()) return
    const conflict = Object.values(snap.val()).find((u) => u.uid !== ignoreUid)
    if (conflict) throw new Error('This name is already taken. Please choose another one.')
  } catch (err) {
    // If index error, this is first user or Firebase index not set up yet - allow it
    if (err?.message?.includes('indexOn') || err?.message?.includes('Index not defined')) {
      return
    }
    throw err
  }
}

const saveUserToRTDB = async (user) => {
  const userRef = ref(rtdb, `users/${user.uid}`)
  const snap = await get(userRef)
  if (!snap.exists()) {
    await set(userRef, {
      uid: user.uid,
      displayName: user.displayName || '',
      email: user.email || '',
      photoURL: user.photoURL || '',
      searchName: (user.displayName || user.email || '').toLowerCase(),
      statusText: '',
      statusUpdatedAt: null,
      createdAt: Date.now(),
      lastSeen: Date.now(),
      online: true,
    })
  } else {
    await update(userRef, { lastSeen: Date.now(), online: true })
  }
}

const setupPresence = (uid) => {
  const userStatusRef = ref(rtdb, `users/${uid}`)
  const connectedRef = ref(rtdb, '.info/connected')

  const unsub = onValue(connectedRef, (snap) => {
    if (snap.val() === true) {
      onDisconnect(userStatusRef).update({
        online: false,
        lastSeen: serverTimestamp(),
      })
      update(userStatusRef, { online: true, lastSeen: Date.now() })
    }
  })

  return unsub
}

/* ───── provider ───── */

export const AuthProvider = ({ children }) => {
  const dispatch = useDispatch()
  const { user, loading } = useSelector((state) => state.auth)

  useEffect(() => {
    setPersistence(auth, browserLocalPersistence).catch(() => {})
    let presenceUnsub = null

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      dispatch(setUser(serializeUser(currentUser)))
      if (currentUser) {
        await saveUserToRTDB(currentUser).catch(() => {})
        presenceUnsub = setupPresence(currentUser.uid)
      }
      dispatch(setLoading(false))
    })

    return () => {
      unsubscribe()
      if (presenceUnsub) presenceUnsub()
    }
  }, [dispatch])

  const signUp = async ({ email, password, displayName }) => {
    const trimmedName = (displayName || '').trim()
    if (!email || !email.includes('@')) throw new Error('Please enter a valid email address.')
    if (!password || password.length < 6) throw new Error('Password must be at least 6 characters.')
    
    try {
      await ensureUniqueDisplayName(trimmedName)
    } catch (nameErr) {
      throw nameErr
    }

    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password)
      await updateProfile(credential.user, { displayName: trimmedName })
      await saveUserToRTDB({ ...credential.user, displayName: trimmedName })

      dispatch(setUser(serializeUser({ ...credential.user, displayName: trimmedName })))
      return credential
    } catch (err) {
      throw new Error(getAuthErrorMessage(err))
    }
  }

  const signIn = async ({ email, password }) => {
    if (!email || !email.includes('@')) throw new Error('Please enter a valid email address.')
    if (!password) throw new Error('Please enter your password.')

    try {
      const credential = await signInWithEmailAndPassword(auth, email, password)
      return credential
    } catch (err) {
      throw new Error(getAuthErrorMessage(err))
    }
  }

  const signInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider)
      const googleName = (result.user.displayName || result.user.email || '').trim()

      // For returning users, skip unique name check
      const userSnap = await get(ref(rtdb, `users/${result.user.uid}`))
      if (!userSnap.exists()) {
        // New Google user — check name uniqueness  
        try {
          await ensureUniqueDisplayName(googleName, result.user.uid)
        } catch (nameErr) {
          await signOut(auth).catch(() => {})
          throw nameErr
        }
      }

      await saveUserToRTDB({ ...result.user, displayName: googleName })
      return result
    } catch (err) {
      if (err.message?.includes('already taken')) throw err
      throw new Error(getAuthErrorMessage(err))
    }
  }

  const logout = async () => {
    if (user?.uid) {
      await update(ref(rtdb, `users/${user.uid}`), {
        online: false,
        lastSeen: Date.now(),
      }).catch(() => {})
    }
    await signOut(auth)
    dispatch(clearAuth())
  }

  // Status management
  const updateStatus = async (statusText) => {
    if (!user?.uid) return
    const trimmed = (statusText || '').trim().slice(0, 150)
    await update(ref(rtdb, `users/${user.uid}`), {
      statusText: trimmed,
      statusUpdatedAt: trimmed ? Date.now() : null,
    })
  }

  const deleteStatus = async () => {
    if (!user?.uid) return
    await update(ref(rtdb, `users/${user.uid}`), {
      statusText: '',
      statusUpdatedAt: null,
    })
  }

  const value = useMemo(
    () => ({
      user,
      loading,
      signUp,
      signIn,
      signInWithGoogle,
      updateStatus,
      deleteStatus,
      logout,
    }),
    [user, loading]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
