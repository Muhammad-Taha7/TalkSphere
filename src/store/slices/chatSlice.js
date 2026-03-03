import { createSlice } from '@reduxjs/toolkit'

const chatSlice = createSlice({
  name: 'chat',
  initialState: {
    selectedChat: null,       // { uid, displayName, email, photoURL, ... }
    mobileView: 'sidebar',   // 'sidebar' | 'chat'
    messages: [],             // array of message objects for the active conversation
    otherUserStatus: { online: false, lastSeen: null },
    otherLastRead: 0,
    otherLastDelivered: 0,
  },
  reducers: {
    selectChat(state, action) {
      state.selectedChat = action.payload
      state.mobileView = 'chat'
      state.messages = []
      state.otherLastRead = 0
      state.otherLastDelivered = 0
      state.otherUserStatus = { online: false, lastSeen: null }
    },
    closeChat(state) {
      state.selectedChat = null
      state.mobileView = 'sidebar'
      state.messages = []
    },
    setMobileView(state, action) {
      state.mobileView = action.payload
    },
    setMessages(state, action) {
      state.messages = action.payload
    },
    setOtherUserStatus(state, action) {
      state.otherUserStatus = action.payload
    },
    setOtherLastRead(state, action) {
      state.otherLastRead = action.payload
    },
    setOtherLastDelivered(state, action) {
      state.otherLastDelivered = action.payload
    },
  },
})

export const {
  selectChat,
  closeChat,
  setMobileView,
  setMessages,
  setOtherUserStatus,
  setOtherLastRead,
  setOtherLastDelivered,
} = chatSlice.actions
export default chatSlice.reducer
