import React, { useEffect, useRef } from 'react'
import { ref, onValue, get, set, remove, onChildAdded } from 'firebase/database'
import { useSelector, useDispatch } from 'react-redux'
import { rtdb } from '../Auth/Firebase'
import { Sidebar } from './Sidebar'
import { ChatWindow } from './ChatWindow'
import { useAuth } from '../Auth/AuthContext'
import { selectChat, closeChat } from '../store/slices/chatSlice'
import { setUnreadMap, clearUnreadForUser, addToast, removeToast } from '../store/slices/notificationSlice'

/* ── Toast notification component ── */
const Toast = ({ toast, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4500)
    return () => clearTimeout(timer)
  }, [onClose])

  const isFriend = toast.type === 'friend_accepted'

  return (
    <div className="pointer-events-auto flex w-80 items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-lg animate-slide-in">
      {/* Icon */}
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${isFriend ? 'bg-emerald-50' : 'bg-indigo-50'}`}>
        {isFriend ? (
          <svg className="h-4 w-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
          </svg>
        ) : (
          <svg className="h-4 w-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
          </svg>
        )}
      </div>
      {/* Content */}
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-slate-800">{toast.fromName}</p>
        <p className="mt-0.5 truncate text-[11px] text-slate-500">{toast.message}</p>
      </div>
      {/* Close */}
      <button onClick={onClose} className="shrink-0 rounded p-0.5 text-slate-300 hover:text-slate-500">
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

export const ChatLayout = () => {
  const { user, logout } = useAuth()
  const dispatch = useDispatch()
  const { selectedChat, mobileView } = useSelector((state) => state.chat)
  const { unreadMap, toasts } = useSelector((state) => state.notifications)

  // Ref to track selected chat uid (avoids stale closures)
  const selectedChatRef = useRef(null)
  useEffect(() => {
    selectedChatRef.current = selectedChat?.uid || null
  }, [selectedChat])

  // Track unread: listen to user's conversations and compare lastRead
  useEffect(() => {
    if (!user?.uid) return

    const userConvsRef = ref(rtdb, `userConversations/${user.uid}`)
    const unsub = onValue(userConvsRef, async (snap) => {
      if (!snap.exists()) {
        dispatch(setUnreadMap({}))
        return
      }

      const convs = snap.val()
      const map = {}

      for (const [convId, convData] of Object.entries(convs)) {
        const otherUid = convData.otherUid
        if (!otherUid) continue

        // Skip the currently open chat — user is already reading it
        if (otherUid === selectedChatRef.current) continue

        const lastMsgAt = convData.lastMessageAt || 0

        // Get lastRead for this user
        const lastReadSnap = await get(ref(rtdb, `conversations/${convId}/lastRead/${user.uid}`))
        const lastRead = lastReadSnap.exists() ? lastReadSnap.val() : 0

        if (lastMsgAt > lastRead) {
          map[otherUid] = true
        }
      }

      dispatch(setUnreadMap(map))
    })

    return () => unsub()
  }, [user?.uid, dispatch])

  const handleSelectChat = (chatUser) => {
    dispatch(selectChat(chatUser))
    dispatch(clearUnreadForUser(chatUser.uid))

    // Immediately mark as read in RTDB so unread tracker doesn't re-flag
    if (user?.uid && chatUser?.uid) {
      const convId = [user.uid, chatUser.uid].sort().join('_')
      set(ref(rtdb, `conversations/${convId}/lastRead/${user.uid}`), Date.now()).catch(() => {})
      set(ref(rtdb, `conversations/${convId}/lastDelivered/${user.uid}`), Date.now()).catch(() => {})
    }
  }

  const handleBack = () => {
    dispatch(closeChat())
  }

  // Browser notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  // Listen for real-time notifications (messages + friend accepted)
  useEffect(() => {
    if (!user?.uid) return

    const notifsRef = ref(rtdb, `notifications/${user.uid}`)

    // Track which notification keys we've already seen on initial load
    const seenKeys = new Set()
    let initialLoadDone = false

    // First, snapshot all existing notifications to mark them as "seen"
    get(notifsRef).then((snap) => {
      if (snap.exists()) {
        Object.keys(snap.val()).forEach((key) => seenKeys.add(key))
        // Clean up old notifications
        remove(notifsRef).catch(() => {})
      }
      initialLoadDone = true
    }).catch(() => {
      initialLoadDone = true
    })

    const unsub = onChildAdded(notifsRef, (snap) => {
      if (!snap.exists()) return
      const notifKey = snap.key

      // Skip notifications that existed before we started listening
      if (seenKeys.has(notifKey)) return
      // Skip if initial load hasn't completed yet
      if (!initialLoadDone) {
        seenKeys.add(notifKey)
        remove(ref(rtdb, `notifications/${user.uid}/${notifKey}`)).catch(() => {})
        return
      }

      const notif = snap.val()

      // Remove the notification from RTDB after reading
      remove(ref(rtdb, `notifications/${user.uid}/${notifKey}`)).catch(() => {})

      // Don't toast for messages from the currently open chat
      if (notif.type === 'new_message' && notif.fromUid === selectedChatRef.current) return

      // Add in-app toast
      const toastId = Date.now() + Math.random()
      dispatch(addToast({ ...notif, id: toastId }))

      // Browser notification (only if tab not focused or different chat)
      if ('Notification' in window && Notification.permission === 'granted') {
        const title =
          notif.type === 'friend_accepted'
            ? 'Friend Request Accepted'
            : `New message from ${notif.fromName}`
        try {
          const n = new Notification(title, {
            body: notif.message || '',
            icon: '/vite.svg',
          })
          setTimeout(() => n.close(), 4000)
        } catch (e) { /* ignore */ }
      }
    })

    return () => unsub()
  }, [user?.uid, dispatch])

  const handleRemoveToast = (id) => {
    dispatch(removeToast(id))
  }

  return (
    <div className="relative flex h-dvh w-full overflow-hidden bg-white">
      {/* Toast notifications */}
      {toasts.length > 0 && (
        <div className="pointer-events-none fixed right-4 top-4 z-[100] flex flex-col gap-2">
          {toasts.map((t) => (
            <Toast key={t.id} toast={t} onClose={() => handleRemoveToast(t.id)} />
          ))}
        </div>
      )}

      {/* Sidebar */}
      <div
        className={`${
          mobileView === 'sidebar' ? 'flex' : 'hidden'
        } h-full w-full flex-col border-r border-slate-200 md:flex md:w-[320px] lg:w-[360px] xl:w-[380px]`}
      >
        <Sidebar
          currentUser={user}
          onSelectChat={handleSelectChat}
          selectedChat={selectedChat}
          onLogout={logout}
          unreadMap={unreadMap}
        />
      </div>

      {/* Chat area */}
      <div
        className={`${
          mobileView === 'chat' ? 'flex' : 'hidden'
        } h-full min-h-0 flex-1 flex-col md:flex`}
      >
        {selectedChat ? (
          <ChatWindow
            currentUser={user}
            chatUser={selectedChat}
            onBack={handleBack}
          />
        ) : (
          <div className="chat-bg flex flex-1 items-center justify-center">
            <div className="space-y-3 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50">
                <svg className="h-7 w-7 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25z" />
                </svg>
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-500">
                TalkSphere
              </p>
              <p className="text-sm text-slate-400">
                Add friends and start a conversation
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
