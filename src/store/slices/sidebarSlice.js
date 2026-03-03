import { createSlice } from '@reduxjs/toolkit'

const sidebarSlice = createSlice({
  name: 'sidebar',
  initialState: {
    activeTab: 'chats',       // 'chats' | 'people'
    searchTerm: '',
    searchResults: [],
    searching: false,
    recentChats: [],          // enriched chat objects with lastMessage etc.
  },
  reducers: {
    setActiveTab(state, action) {
      state.activeTab = action.payload
    },
    setSearchTerm(state, action) {
      state.searchTerm = action.payload
    },
    setSearchResults(state, action) {
      state.searchResults = action.payload
    },
    setSearching(state, action) {
      state.searching = action.payload
    },
    setRecentChats(state, action) {
      state.recentChats = action.payload
    },
    clearSidebar(state) {
      state.activeTab = 'chats'
      state.searchTerm = ''
      state.searchResults = []
      state.searching = false
      state.recentChats = []
    },
  },
})

export const {
  setActiveTab,
  setSearchTerm,
  setSearchResults,
  setSearching,
  setRecentChats,
  clearSidebar,
} = sidebarSlice.actions
export default sidebarSlice.reducer
