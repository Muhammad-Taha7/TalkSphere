import { createSlice } from '@reduxjs/toolkit'

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,   // serializable user object { uid, displayName, email, photoURL }
    loading: true,
  },
  reducers: {
    setUser(state, action) {
      state.user = action.payload
    },
    setLoading(state, action) {
      state.loading = action.payload
    },
    clearAuth(state) {
      state.user = null
      state.loading = false
    },
  },
})

export const { setUser, setLoading, clearAuth } = authSlice.actions
export default authSlice.reducer
