import React, { useEffect, useRef, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import {
  ref,
  push,
  set,
  get,
  update,
  onValue,
  query as rtdbQuery,
  orderByChild,
} from 'firebase/database'
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'
import { rtdb, storage } from '../Auth/Firebase'
import { UserAvatar } from './UserAvatar'
import { MessageBubble } from './MessageBubble'
import EmojiPicker from 'emoji-picker-react'
import { setMessages as setMsgs, setOtherUserStatus as setStatus, setOtherLastRead as setLastRead, setOtherLastDelivered as setLastDelivered } from '../store/slices/chatSlice'

const getConversationId = (uid1, uid2) => {
  return [uid1, uid2].sort().join('_')
}

export const ChatWindow = ({ currentUser, chatUser, onBack }) => {
  const dispatch = useDispatch()
  const { messages, otherUserStatus, otherLastRead, otherLastDelivered } = useSelector((s) => s.chat)

  // Local-only UI state
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [showEmoji, setShowEmoji] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [editingMsg, setEditingMsg] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [otherStatusText, setOtherStatusText] = useState('')
  const scrollRef = useRef(null)
  const inputRef = useRef(null)
  const fileRef = useRef(null)
  const emojiRef = useRef(null)

  const conversationId = getConversationId(currentUser.uid, chatUser.uid)

  // Listen for other user's online/lastSeen status
  useEffect(() => {
    const userStatusRef = ref(rtdb, `users/${chatUser.uid}`)
    const unsub = onValue(userStatusRef, (snap) => {
      if (snap.exists()) {
        const data = snap.val()
        dispatch(setStatus({
          online: data.online || false,
          lastSeen: data.lastSeen || null,
        }))
      }
    })
    return () => unsub()
  }, [chatUser.uid])

  // Listen for other user's status text
  useEffect(() => {
    const statusRef = ref(rtdb, `users/${chatUser.uid}/statusText`)
    const unsub = onValue(statusRef, (snap) => {
      setOtherStatusText(snap.exists() ? snap.val() : '')
    })
    return () => unsub()
  }, [chatUser.uid])

  // Listen for messages
  useEffect(() => {
    const msgsRef = ref(rtdb, `conversations/${conversationId}/messages`)
    const q = rtdbQuery(msgsRef, orderByChild('createdAt'))

    const unsub = onValue(q, (snapshot) => {
      const msgs = []
      if (snapshot.exists()) {
        snapshot.forEach((child) => {
          const data = child.val()
          // Skip messages deleted for current user (one-side delete)
          if (data.deletedFor && data.deletedFor[currentUser.uid]) return
          msgs.push({ id: child.key, ...data })
        })
      }
      dispatch(setMsgs(msgs))
    })

    return () => unsub()
  }, [conversationId, currentUser.uid])

  // Mark as read
  useEffect(() => {
    const lastReadRef = ref(rtdb, `conversations/${conversationId}/lastRead/${currentUser.uid}`)
    set(lastReadRef, Date.now()).catch(() => {})
  }, [messages.length, conversationId, currentUser.uid])

  // Mark as delivered (anytime chat is open we have received latest messages)
  useEffect(() => {
    const deliveredRef = ref(rtdb, `conversations/${conversationId}/lastDelivered/${currentUser.uid}`)
    set(deliveredRef, Date.now()).catch(() => {})
  }, [messages.length, conversationId, currentUser.uid])

  // Listen to other user's lastRead (for seen ticks)
  useEffect(() => {
    const otherReadRef = ref(rtdb, `conversations/${conversationId}/lastRead/${chatUser.uid}`)
    const unsub = onValue(otherReadRef, (snap) => {
      dispatch(setLastRead(snap.exists() ? snap.val() : 0))
    })
    return () => unsub()
  }, [conversationId, chatUser.uid])

  // Listen to other user's lastDelivered (for double ticks)
  useEffect(() => {
    const otherDeliverRef = ref(rtdb, `conversations/${conversationId}/lastDelivered/${chatUser.uid}`)
    const unsub = onValue(otherDeliverRef, (snap) => {
      dispatch(setLastDelivered(snap.exists() ? snap.val() : 0))
    })
    return () => unsub()
  }, [conversationId, chatUser.uid])

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // Focus input
  useEffect(() => {
    inputRef.current?.focus()
  }, [chatUser.uid])

  // Close emoji on outside click
  useEffect(() => {
    const handler = (e) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target)) {
        setShowEmoji(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const updateConversationMeta = async (msg) => {
    const now = Date.now()

    // Update conversation info
    const convInfoRef = ref(rtdb, `conversations/${conversationId}/info`)
    const convSnap = await get(convInfoRef)

    if (!convSnap.exists()) {
      await set(convInfoRef, {
        participants: { [currentUser.uid]: true, [chatUser.uid]: true },
        lastMessage: msg,
        lastMessageAt: now,
        createdAt: now,
      })
    } else {
      await update(convInfoRef, {
        lastMessage: msg,
        lastMessageAt: now,
      })
    }

    // Update lastRead for sender
    await set(ref(rtdb, `conversations/${conversationId}/lastRead/${currentUser.uid}`), now)

    // Update userConversations for both users
    await update(ref(rtdb, `userConversations/${currentUser.uid}/${conversationId}`), {
      otherUid: chatUser.uid,
      lastMessage: msg,
      lastMessageAt: now,
    })
    await update(ref(rtdb, `userConversations/${chatUser.uid}/${conversationId}`), {
      otherUid: currentUser.uid,
      lastMessage: msg,
      lastMessageAt: now,
    })
  }

  // Send notification to other user in RTDB
  const sendNotification = async (messagePreview) => {
    try {
      const notifRef = push(ref(rtdb, `notifications/${chatUser.uid}`))
      await set(notifRef, {
        type: 'new_message',
        fromUid: currentUser.uid,
        fromName: currentUser.displayName || currentUser.email || '',
        fromPhotoURL: currentUser.photoURL || '',
        message: messagePreview,
        createdAt: Date.now(),
      })
    } catch (err) {
      console.error('Failed to send notification:', err)
    }
  }

  const handleSend = async (e) => {
    e.preventDefault()
    const msg = text.trim()
    if (!msg || sending) return

    // If editing an existing message
    if (editingMsg) {
      try {
        const msgRef = ref(rtdb, `conversations/${conversationId}/messages/${editingMsg.id}`)
        await update(msgRef, { text: msg, edited: true })
      } catch (err) {
        console.error('Failed to edit message:', err)
      }
      setEditingMsg(null)
      setText('')
      return
    }

    setSending(true)
    setText('')
    setShowEmoji(false)

    try {
      await updateConversationMeta(msg)

      const msgsRef = ref(rtdb, `conversations/${conversationId}/messages`)
      const newMsgRef = push(msgsRef)
      await set(newMsgRef, {
        text: msg,
        senderId: currentUser.uid,
        senderName: currentUser.displayName || currentUser.email || '',
        createdAt: Date.now(),
        type: 'text',
      })

      // Notify recipient
      await sendNotification(msg.length > 50 ? msg.slice(0, 50) + '...' : msg)
    } catch (err) {
      console.error('Failed to send message:', err)
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      alert('File size must be under 10MB')
      return
    }

    setUploading(true)
    try {
      const filePath = `chat_files/${conversationId}/${Date.now()}_${file.name}`
      const sRef = storageRef(storage, filePath)
      await uploadBytes(sRef, file)
      const url = await getDownloadURL(sRef)

      const isImage = file.type.startsWith('image/')
      const displayText = isImage ? '📷 Photo' : `📎 ${file.name}`

      await updateConversationMeta(displayText)

      const msgsRef = ref(rtdb, `conversations/${conversationId}/messages`)
      const newMsgRef = push(msgsRef)
      await set(newMsgRef, {
        text: displayText,
        fileURL: url,
        fileName: file.name,
        fileType: file.type,
        senderId: currentUser.uid,
        senderName: currentUser.displayName || currentUser.email || '',
        createdAt: Date.now(),
        type: isImage ? 'image' : 'file',
      })

      // Notify recipient
      await sendNotification(displayText)
    } catch (err) {
      console.error('Failed to upload file:', err)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  // One-side delete: marks message as deleted only for current user
  const deleteMessageForMe = async (msgId) => {
    try {
      const msgRef = ref(rtdb, `conversations/${conversationId}/messages/${msgId}/deletedFor/${currentUser.uid}`)
      await set(msgRef, true)
    } catch (err) {
      console.error('Failed to delete:', err)
    }
  }

  const requestDeleteMessage = (msg) => setDeleteTarget(msg)

  const confirmDeleteMessage = async () => {
    if (!deleteTarget) return
    await deleteMessageForMe(deleteTarget.id)
    setDeleteTarget(null)
  }

  const cancelDeleteMessage = () => setDeleteTarget(null)

  const handleEdit = (msg) => {
    setEditingMsg(msg)
    setText(msg.text)
    inputRef.current?.focus()
  }

  const cancelEdit = () => {
    setEditingMsg(null)
    setText('')
  }

  const onEmojiClick = (emojiData) => {
    setText((prev) => prev + emojiData.emoji)
    inputRef.current?.focus()
  }

  const formatTime = (timestamp) => {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const formatLastSeen = (timestamp) => {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now - date
    if (diff < 60000) return 'just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-slate-100 px-3 py-2.5 sm:px-5 sm:py-3">
        <button
          onClick={onBack}
          className="mr-0.5 rounded-xl p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 active:scale-90 md:mr-1"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>

        <UserAvatar
          name={chatUser.displayName || chatUser.email}
          photoURL={chatUser.photoURL}
          size={38}
          online={otherUserStatus.online}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-slate-800">
            {chatUser.displayName || 'User'}
          </p>
          {otherStatusText ? (
            <p className="truncate text-[11px] text-indigo-500">{otherStatusText}</p>
          ) : (
            <p className="truncate text-[11px] text-slate-400">
              {otherUserStatus.online
                ? 'Online'
                : otherUserStatus.lastSeen
                  ? `Last seen ${formatLastSeen(otherUserStatus.lastSeen)}`
                  : chatUser.email}
            </p>
          )}
        </div>

        <button
          onClick={onBack}
          className="ml-auto hidden rounded-xl border border-slate-200 px-3 py-1.5 text-[11px] font-semibold text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 active:scale-95 md:inline-flex"
        >
          Close chat
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="chat-bg min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3 space-y-1 scrollbar-thin sm:px-5 sm:py-4">
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <div className="animate-fade-in text-center space-y-3">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50">
                <svg className="h-6 w-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-slate-500">
                Say hello to {chatUser.displayName || 'your friend'} 👋
              </p>
              <p className="text-[11px] text-slate-400">
                Start the conversation — send a message!
              </p>
            </div>
          </div>
        )}
        {messages.map((msg, idx) => {
          const isOwn = msg.senderId === currentUser.uid
          const prevMsg = messages[idx - 1]
          const showAvatar = !prevMsg || prevMsg.senderId !== msg.senderId

          return (
            <MessageBubble
              key={msg.id}
              message={msg}
              time={formatTime(msg.createdAt)}
              isOwn={isOwn}
              showAvatar={showAvatar}
              senderPhotoURL={!isOwn ? chatUser.photoURL : undefined}
              onDelete={() => requestDeleteMessage(msg)}
              onEdit={isOwn && msg.type !== 'image' && msg.type !== 'file' ? () => handleEdit(msg) : undefined}
              deliveredByOther={isOwn && msg.createdAt <= otherLastDelivered}
              seenByOther={isOwn && msg.createdAt <= otherLastRead}
            />
          )
        })}
      </div>

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4" onClick={cancelDeleteMessage}>
          <div className="w-full max-w-sm animate-scale-in rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm font-bold text-slate-800">Delete this message?</p>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">
              It will disappear only for you. This action cannot be undone.
            </p>
            <div className="mt-5 flex justify-end gap-2 text-xs font-bold">
              <button
                onClick={cancelDeleteMessage}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-slate-500 transition hover:bg-slate-50 active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteMessage}
                className="rounded-xl bg-red-500 px-4 py-2.5 text-white transition hover:bg-red-600 active:scale-95"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Editing banner */}
      {editingMsg && (
        <div className="flex shrink-0 items-center justify-between border-t border-indigo-100 bg-indigo-50 px-4 py-2 sm:px-5">
          <div className="flex items-center gap-2 text-xs text-indigo-600">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
            </svg>
            Editing message
          </div>
          <button onClick={cancelEdit} className="text-xs font-medium text-indigo-500 hover:text-indigo-700">
            Cancel
          </button>
        </div>
      )}

      {/* Input */}
      <div className="shrink-0 border-t border-slate-100 px-2.5 py-2 safe-bottom sm:px-4 sm:py-3">
        <form onSubmit={handleSend} className="flex items-end gap-1 sm:gap-2">
          {/* Emoji toggle */}
          <div className="relative hidden sm:block" ref={emojiRef}>
            <button
              type="button"
              onClick={() => setShowEmoji((p) => !p)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" />
              </svg>
            </button>
            {showEmoji && (
              <div className="absolute bottom-12 left-0 z-50 shadow-xl rounded-2xl overflow-hidden">
                <EmojiPicker
                  onEmojiClick={onEmojiClick}
                  width={320}
                  height={380}
                  theme="light"
                  searchPlaceholder="Search emoji..."
                  skinTonesDisabled
                  previewConfig={{ showPreview: false }}
                />
              </div>
            )}
          </div>

          {/* File upload */}
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            accept="image/*,.pdf,.doc,.docx,.txt,.zip,.rar"
            onChange={handleFileUpload}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:text-slate-300 sm:h-10 sm:w-10"
          >
            {uploading ? (
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
              </svg>
            )}
          </button>

          {/* Text input */}
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={editingMsg ? 'Edit message...' : 'Message...'}
            className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none placeholder:text-slate-400 transition focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100 sm:px-4"
          />

          {/* Send */}
          <button
            type="submit"
            disabled={!text.trim() || sending}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm transition hover:bg-indigo-700 active:scale-90 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none sm:h-10 sm:w-10"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
              />
            </svg>
          </button>
        </form>
      </div>
    </div>
  )
}
