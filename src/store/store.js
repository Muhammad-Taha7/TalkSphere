import { configureStore } from '@reduxjs/toolkit'
import authReducer from './slices/authSlice'
import chatReducer from './slices/chatSlice'
import friendsReducer from './slices/friendsSlice'
import sidebarReducer from './slices/sidebarSlice'
import notificationReducer from './slices/notificationSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    chat: chatReducer,
    friends: friendsReducer,
    sidebar: sidebarReducer,
    notifications: notificationReducer,
  },
})
