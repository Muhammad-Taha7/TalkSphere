import { createSlice } from '@reduxjs/toolkit'

const friendsSlice = createSlice({
  name: 'friends',
  initialState: {
    friendsMap: {},            // { uid: true } — quick lookup
    friendsList: [],           // full profile objects
    incomingRequests: [],      // [{ fromUid, fromName, fromEmail, fromPhotoURL, sentAt }]
    outgoingRequests: {},      // { uid: true }
  },
  reducers: {
    setFriendsMap(state, action) {
      state.friendsMap = action.payload
    },
    setFriendsList(state, action) {
      state.friendsList = action.payload
    },
    setIncomingRequests(state, action) {
      state.incomingRequests = action.payload
    },
    setOutgoingRequests(state, action) {
      state.outgoingRequests = action.payload
    },
    clearFriends(state) {
      state.friendsMap = {}
      state.friendsList = []
      state.incomingRequests = []
      state.outgoingRequests = {}
    },
  },
})

export const {
  setFriendsMap,
  setFriendsList,
  setIncomingRequests,
  setOutgoingRequests,
  clearFriends,
} = friendsSlice.actions
export default friendsSlice.reducer
