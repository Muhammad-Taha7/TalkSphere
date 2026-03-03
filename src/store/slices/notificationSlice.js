import { createSlice } from '@reduxjs/toolkit'

const notificationSlice = createSlice({
  name: 'notifications',
  initialState: {
    unreadMap: {},   // { otherUid: true }
    toasts: [],      // [{ id, type, fromName, fromPhotoURL, message }]
  },
  reducers: {
    setUnreadMap(state, action) {
      state.unreadMap = action.payload
    },
    clearUnreadForUser(state, action) {
      delete state.unreadMap[action.payload]
    },
    addToast(state, action) {
      // keep max 5 toasts
      state.toasts = [...state.toasts.slice(-4), action.payload]
    },
    removeToast(state, action) {
      state.toasts = state.toasts.filter((t) => t.id !== action.payload)
    },
    clearNotifications(state) {
      state.unreadMap = {}
      state.toasts = []
    },
  },
})

export const {
  setUnreadMap,
  clearUnreadForUser,
  addToast,
  removeToast,
  clearNotifications,
} = notificationSlice.actions
export default notificationSlice.reducer
