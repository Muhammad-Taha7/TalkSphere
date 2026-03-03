import React, { useCallback, useEffect, useState } from 'react'
import { ref, get, set, remove, update, onValue, push } from 'firebase/database'
import { useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { rtdb } from '../Auth/Firebase'
import { UserAvatar } from './UserAvatar'
import { setFriendsMap, setFriendsList, setIncomingRequests, setOutgoingRequests } from '../store/slices/friendsSlice'
import { setActiveTab as setTab, setSearchTerm as setTerm, setSearchResults as setResults, setSearching as setIsSearching, setRecentChats as setChats } from '../store/slices/sidebarSlice'

export const Sidebar = ({ currentUser, onSelectChat, selectedChat, onLogout, unreadMap = {} }) => {
  const dispatch = useDispatch()
  const { friendsMap: friends, friendsList, incomingRequests, outgoingRequests } = useSelector((s) => s.friends)
  const { activeTab, searchTerm, searchResults, searching, recentChats } = useSelector((s) => s.sidebar)
  const [unfriendTarget, setUnfriendTarget] = useState(null)
  const navigate = useNavigate()

  /* ───── listeners ───── */

  // Friends map + full friend profiles
  useEffect(() => {
    if (!currentUser?.uid) return
    const friendsRef = ref(rtdb, `friends/${currentUser.uid}`)
    const unsub = onValue(friendsRef, async (snap) => {
      if (!snap.exists()) { dispatch(setFriendsMap({})); dispatch(setFriendsList([])); return }
      const data = snap.val()
      dispatch(setFriendsMap(data))
      const list = []
      for (const friendUid of Object.keys(data)) {
        const userSnap = await get(ref(rtdb, `users/${friendUid}`))
        if (userSnap.exists()) list.push(userSnap.val())
      }
      dispatch(setFriendsList(list))
    })
    return () => unsub()
  }, [currentUser?.uid, dispatch])

  // Incoming friend requests
  useEffect(() => {
    if (!currentUser?.uid) return
    const reqRef = ref(rtdb, `friendRequests/${currentUser.uid}`)
    const unsub = onValue(reqRef, (snap) => {
      if (!snap.exists()) { dispatch(setIncomingRequests([])); return }
      const data = snap.val()
      dispatch(setIncomingRequests(
        Object.entries(data).map(([fromUid, d]) => ({ fromUid, ...d }))
      ))
    })
    return () => unsub()
  }, [currentUser?.uid, dispatch])

  // Outgoing (sent) requests
  useEffect(() => {
    if (!currentUser?.uid) return
    const sentRef = ref(rtdb, `sentRequests/${currentUser.uid}`)
    const unsub = onValue(sentRef, (snap) => {
      dispatch(setOutgoingRequests(snap.exists() ? snap.val() : {}))
    })
    return () => unsub()
  }, [currentUser?.uid, dispatch])

  // Recent chats
  useEffect(() => {
    if (!currentUser?.uid) return
    const userConvsRef = ref(rtdb, `userConversations/${currentUser.uid}`)
    const unsub = onValue(userConvsRef, async (snap) => {
      if (!snap.exists()) { dispatch(setChats([])); return }
      const convs = snap.val()
      const chats = []
      for (const [convId, convData] of Object.entries(convs)) {
        const otherUid = convData.otherUid
        if (!otherUid) continue
        const userSnap = await get(ref(rtdb, `users/${otherUid}`))
        if (userSnap.exists()) {
          chats.push({
            conversationId: convId,
            ...userSnap.val(),
            lastMessage: convData.lastMessage || '',
            lastMessageAt: convData.lastMessageAt || 0,
          })
        }
      }
      chats.sort((a, b) => (b.lastMessageAt || 0) - (a.lastMessageAt || 0))
      dispatch(setChats(chats))
    })
    return () => unsub()
  }, [currentUser?.uid, dispatch])

  /* ───── search ───── */

  const handleSearch = useCallback(async () => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) { dispatch(setResults([])); return }
    dispatch(setIsSearching(true))
    try {
      const snap = await get(ref(rtdb, 'users'))
      const results = []
      if (snap.exists()) {
        Object.values(snap.val()).forEach((u) => {
          if (u.uid === currentUser.uid) return
          const name = (u.searchName || u.displayName || u.email || '').toLowerCase()
          const email = (u.email || '').toLowerCase()
          if (name.includes(term) || email.includes(term)) results.push(u)
        })
      }
      dispatch(setResults(results))
    } catch (err) {
      console.error('Search failed:', err)
      dispatch(setResults([]))
    } finally {
      dispatch(setIsSearching(false))
    }
  }, [searchTerm, currentUser?.uid])

  useEffect(() => {
    const t = setTimeout(() => {
      searchTerm.trim() ? handleSearch() : dispatch(setResults([]))
    }, 400)
    return () => clearTimeout(t)
  }, [searchTerm, handleSearch])

  /* ───── friend actions ───── */

  const sendFriendRequest = async (toUser) => {
    try {
      await set(ref(rtdb, `friendRequests/${toUser.uid}/${currentUser.uid}`), {
        fromUid: currentUser.uid,
        fromName: currentUser.displayName || currentUser.email || '',
        fromEmail: currentUser.email || '',
        fromPhotoURL: currentUser.photoURL || '',
        sentAt: Date.now(),
      })
      await set(ref(rtdb, `sentRequests/${currentUser.uid}/${toUser.uid}`), true)
    } catch (err) {
      console.error('Send request failed:', err)
    }
  }

  const acceptFriendRequest = async (fromUid) => {
    try {
      const updates = {}
      updates[`friends/${currentUser.uid}/${fromUid}`] = true
      updates[`friends/${fromUid}/${currentUser.uid}`] = true
      updates[`friendRequests/${currentUser.uid}/${fromUid}`] = null
      updates[`sentRequests/${fromUid}/${currentUser.uid}`] = null
      await update(ref(rtdb), updates)

      const notifRef = push(ref(rtdb, `notifications/${fromUid}`))
      await set(notifRef, {
        type: 'friend_accepted',
        fromUid: currentUser.uid,
        fromName: currentUser.displayName || currentUser.email || '',
        fromPhotoURL: currentUser.photoURL || '',
        message: `${currentUser.displayName || currentUser.email} accepted your friend request`,
        createdAt: Date.now(),
      })
    } catch (err) {
      console.error('Accept failed:', err)
    }
  }

  const rejectFriendRequest = async (fromUid) => {
    try {
      const updates = {}
      updates[`friendRequests/${currentUser.uid}/${fromUid}`] = null
      updates[`sentRequests/${fromUid}/${currentUser.uid}`] = null
      await update(ref(rtdb), updates)
    } catch (err) {
      console.error('Reject failed:', err)
    }
  }

  const confirmUnfriend = async () => {
    if (!unfriendTarget) return
    try {
      const targetUid = unfriendTarget.uid
      const convId = [currentUser.uid, targetUid].sort().join('_')
      const updates = {}
      updates[`friends/${currentUser.uid}/${targetUid}`] = null
      updates[`friends/${targetUid}/${currentUser.uid}`] = null
      updates[`userConversations/${currentUser.uid}/${convId}`] = null
      updates[`userConversations/${targetUid}/${convId}`] = null
      await update(ref(rtdb), updates)
    } catch (err) {
      console.error('Unfriend failed:', err)
    } finally {
      setUnfriendTarget(null)
    }
  }

  const cancelUnfriend = () => setUnfriendTarget(null)

  /* ───── helpers ───── */

  const formatTime = (ts) => {
    if (!ts) return ''
    const d = new Date(ts), now = new Date(), diff = now - d
    if (diff < 86400000) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    if (diff < 604800000) return d.toLocaleDateString([], { weekday: 'short' })
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  const getUserStatus = (uid) => {
    if (friends[uid]) return 'friends'
    if (outgoingRequests[uid]) return 'sent'
    if (incomingRequests.some((r) => r.fromUid === uid)) return 'received'
    return 'none'
  }

  const isSearching = searchTerm.trim().length > 0

  /* ───── render ───── */

  return (
    <div className="flex h-full flex-col bg-white">
      {/* ── Header ── */}
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5 sm:px-5 sm:py-4">
        <button
          onClick={() => navigate('/profile')}
          className="flex items-center gap-3 rounded-xl py-1 pr-2 transition hover:bg-slate-50 active:scale-[0.98]"
        >
          <UserAvatar
            name={currentUser?.displayName || currentUser?.email}
            photoURL={currentUser?.photoURL}
            size={38}
          />
          <div className="text-left">
            <p className="text-sm font-semibold text-slate-800">
              {currentUser?.displayName || 'User'}
            </p>
            <p className="max-w-[120px] truncate text-[11px] text-slate-400 sm:max-w-[140px]">
              {currentUser?.email}
            </p>
          </div>
        </button>
        <button
          onClick={onLogout}
          className="rounded-xl border border-slate-200 px-3 py-1.5 text-[11px] font-semibold text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-500 active:scale-95"
        >
          Sign out
        </button>
      </div>

      {/* ── Search ── */}
      <div className="px-3.5 py-3 sm:px-4">
        <div className="relative">
          <svg className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => dispatch(setTerm(e.target.value))}
            placeholder="Search users..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-9 text-sm text-slate-700 outline-none placeholder:text-slate-400 transition focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100"
          />
          {searchTerm && (
            <button
              onClick={() => dispatch(setTerm(''))}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-slate-400 transition hover:text-slate-600"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* ── Tabs (hidden while searching) ── */}
      {!isSearching && (
        <div className="flex border-b border-slate-100 px-4">
          <button
            onClick={() => dispatch(setTab('chats'))}
            className={`flex-1 py-2.5 text-xs font-bold tracking-wide transition ${
              activeTab === 'chats'
                ? 'border-b-2 border-indigo-500 text-indigo-600'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Chats
          </button>
          <button
            onClick={() => dispatch(setTab('people'))}
            className={`relative flex-1 py-2.5 text-xs font-bold tracking-wide transition ${
              activeTab === 'people'
                ? 'border-b-2 border-indigo-500 text-indigo-600'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            People
            {incomingRequests.length > 0 && (
              <span className="ml-1.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                {incomingRequests.length}
              </span>
            )}
          </button>
        </div>
      )}

      {/* ═══ Content area ═══ */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain scrollbar-thin safe-bottom">

        {/* ── Search results ── */}
        {isSearching && (
          <>
            <div className="px-5 py-2.5">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
                {searching ? 'Searching...' : `${searchResults.length} result${searchResults.length !== 1 ? 's' : ''}`}
              </p>
            </div>

            {searchResults.length === 0 && !searching && (
              <div className="px-5 py-12 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                  <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 16.318A4.486 4.486 0 0012.016 15a4.486 4.486 0 00-3.198 1.318M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" />
                  </svg>
                </div>
                <p className="text-xs text-slate-400">No users found</p>
              </div>
            )}

            {searchResults.map((u) => {
              const status = getUserStatus(u.uid)
              return (
                <div key={u.uid} className="flex items-center gap-3 px-4 py-3 transition hover:bg-slate-50 sm:px-5">
                  <UserAvatar name={u.displayName || u.email} photoURL={u.photoURL} size={42} online={u.online} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-700">{u.displayName || u.email}</p>
                    {u.statusText ? (
                      <p className="truncate text-[11px] text-indigo-500">{u.statusText}</p>
                    ) : (
                      <p className="truncate text-[11px] text-slate-400">{u.email}</p>
                    )}
                  </div>

                  {status === 'friends' && (
                    <button
                      onClick={() => { onSelectChat(u); dispatch(setTerm('')) }}
                      className="rounded-lg bg-indigo-50 px-3 py-1.5 text-[11px] font-bold text-indigo-600 transition hover:bg-indigo-100 active:scale-95"
                    >
                      Chat
                    </button>
                  )}
                  {status === 'sent' && (
                    <span className="rounded-lg bg-amber-50 px-3 py-1.5 text-[11px] font-bold text-amber-600">
                      Pending
                    </span>
                  )}
                  {status === 'received' && (
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => acceptFriendRequest(u.uid)}
                        className="rounded-lg bg-indigo-600 px-2.5 py-1.5 text-[11px] font-bold text-white transition hover:bg-indigo-700 active:scale-95"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => rejectFriendRequest(u.uid)}
                        className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-semibold text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-500 active:scale-95"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                  {status === 'none' && (
                    <button
                      onClick={() => sendFriendRequest(u)}
                      className="rounded-lg bg-indigo-600 px-3 py-1.5 text-[11px] font-bold text-white transition hover:bg-indigo-700 active:scale-95"
                    >
                      Add
                    </button>
                  )}
                </div>
              )
            })}
          </>
        )}

        {/* ── Chats tab ── */}
        {!isSearching && activeTab === 'chats' && (
          <>
            {recentChats.length === 0 && (
              <div className="px-5 py-12 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50">
                  <svg className="h-5 w-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                  </svg>
                </div>
                <p className="text-xs font-medium text-slate-400">No conversations yet</p>
                <p className="mt-1 text-[11px] text-slate-400">Add friends to start chatting</p>
              </div>
            )}
            {recentChats.map((chatUser) => {
              const isSelected = selectedChat?.uid === chatUser.uid
              const hasUnread = !!unreadMap[chatUser.uid]
              return (
                <button
                  key={chatUser.uid}
                  onClick={() => onSelectChat(chatUser)}
                  className={`flex w-full items-center gap-3 px-4 py-3 text-left transition sm:px-5 ${
                    isSelected ? 'bg-indigo-50/70' : 'hover:bg-slate-50 active:bg-slate-100'
                  }`}
                >
                  <div className="relative shrink-0">
                    <UserAvatar
                      name={chatUser.displayName || chatUser.email}
                      photoURL={chatUser.photoURL}
                      size={44}
                      online={chatUser.online}
                    />
                    {hasUnread && (
                      <>
                        <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-indigo-500 ring-2 ring-white" />
                        <span className="notif-ping absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-indigo-400" />
                      </>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className={`truncate text-sm ${hasUnread ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'}`}>
                        {chatUser.displayName || chatUser.email}
                      </p>
                      {chatUser.lastMessageAt ? (
                        <span className={`shrink-0 text-[10px] ${hasUnread ? 'font-semibold text-indigo-500' : 'text-slate-400'}`}>
                          {formatTime(chatUser.lastMessageAt)}
                        </span>
                      ) : null}
                    </div>
                    {chatUser.statusText ? (
                      <p className="mt-0.5 truncate text-[11px] text-indigo-500">
                        {chatUser.statusText}
                      </p>
                    ) : chatUser.lastMessage ? (
                      <p className={`mt-0.5 truncate text-xs ${hasUnread ? 'font-medium text-slate-600' : 'text-slate-400'}`}>
                        {chatUser.lastMessage}
                      </p>
                    ) : null}
                  </div>
                </button>
              )
            })}
          </>
        )}

        {/* ── People tab ── */}
        {!isSearching && activeTab === 'people' && (
          <>
            {/* Incoming requests */}
            {incomingRequests.length > 0 && (
              <div>
                <div className="px-5 py-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
                    Friend Requests ({incomingRequests.length})
                  </p>
                </div>
                {incomingRequests.map((req) => (
                  <div key={req.fromUid} className="flex items-center gap-3 px-4 py-3 transition hover:bg-slate-50 sm:px-5">
                    <UserAvatar name={req.fromName || req.fromEmail} photoURL={req.fromPhotoURL} size={42} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-700">{req.fromName || req.fromEmail}</p>
                      <p className="truncate text-[11px] text-slate-400">{req.fromEmail}</p>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => acceptFriendRequest(req.fromUid)}
                        className="rounded-lg bg-indigo-600 px-2.5 py-1.5 text-[11px] font-bold text-white transition hover:bg-indigo-700 active:scale-95"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => rejectFriendRequest(req.fromUid)}
                        className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-semibold text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-500 active:scale-95"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
                <div className="mx-5 my-2 border-t border-slate-100" />
              </div>
            )}

            {/* Friends list */}
            <div className="px-5 py-2.5">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
                Your Friends ({friendsList.length})
              </p>
            </div>
            {friendsList.length === 0 && (
              <div className="px-5 py-8 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                  <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                  </svg>
                </div>
                <p className="text-xs font-medium text-slate-400">No friends yet</p>
                <p className="mt-1 text-[11px] text-slate-400">Search to find and add people</p>
              </div>
            )}
            {friendsList.map((friend) => (
              <div
                key={friend.uid}
                onClick={() => { onSelectChat(friend); dispatch(setTab('chats')) }}
                className={`flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition sm:px-5 ${
                  selectedChat?.uid === friend.uid ? 'bg-indigo-50/70' : 'hover:bg-slate-50 active:bg-slate-100'
                }`}
              >
                <UserAvatar
                  name={friend.displayName || friend.email}
                  photoURL={friend.photoURL}
                  size={42}
                  online={friend.online}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-700">
                    {friend.displayName || friend.email}
                  </p>
                  {friend.statusText ? (
                    <p className="truncate text-[11px] text-indigo-500">{friend.statusText}</p>
                  ) : (
                    <p className="truncate text-[11px] text-slate-400">
                      {friend.online ? '● Online' : friend.email}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setUnfriendTarget(friend) }}
                    className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-bold text-red-500 transition hover:bg-red-50 active:scale-95"
                  >
                    Unfriend
                  </button>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* ── Unfriend modal ── */}
      {unfriendTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4" onClick={cancelUnfriend}>
          <div className="w-full max-w-sm animate-scale-in rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm font-bold text-slate-800">Unfriend {unfriendTarget.displayName || unfriendTarget.email}?</p>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">
              You will no longer see each other's chats until you add them again.
            </p>
            <div className="mt-5 flex justify-end gap-2 text-xs font-bold">
              <button
                onClick={cancelUnfriend}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-slate-500 transition hover:bg-slate-50 active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={confirmUnfriend}
                className="rounded-xl bg-red-500 px-4 py-2.5 text-white transition hover:bg-red-600 active:scale-95"
              >
                Unfriend
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
