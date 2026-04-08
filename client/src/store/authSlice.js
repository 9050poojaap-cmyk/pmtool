import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authApi } from '../api/services';
import { setAuthToken } from '../api/client';

const tokenKey = 'pmtool_token';

export const loadStoredAuth = createAsyncThunk('auth/loadStored', async (_, { rejectWithValue }) => {
  const token = localStorage.getItem(tokenKey);
  if (!token) return null;
  setAuthToken(token);
  try {
    const { data } = await authApi.me();
    return { token, user: data.user };
  } catch {
    localStorage.removeItem(tokenKey);
    setAuthToken(null);
    return rejectWithValue(null);
  }
});

export const loginThunk = createAsyncThunk('auth/login', async (body, { rejectWithValue }) => {
  try {
    const { data } = await authApi.login(body);
    localStorage.setItem(tokenKey, data.token);
    setAuthToken(data.token);
    return data;
  } catch (e) {
    return rejectWithValue(e.response?.data?.message || 'Login failed');
  }
});

export const registerThunk = createAsyncThunk('auth/register', async (body, { rejectWithValue }) => {
  try {
    const { data } = await authApi.register(body);
    localStorage.setItem(tokenKey, data.token);
    setAuthToken(data.token);
    return data;
  } catch (e) {
    return rejectWithValue(e.response?.data?.message || 'Signup failed');
  }
});

export const refreshMeThunk = createAsyncThunk('auth/refreshMe', async (_, { rejectWithValue }) => {
  try {
    const { data } = await authApi.me();
    return data.user;
  } catch (e) {
    return rejectWithValue(e.response?.data?.message);
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    token: null,
    initialized: false,
    loading: false,
    error: null,
  },
  reducers: {
    logout(state) {
      state.user = null;
      state.token = null;
      localStorage.removeItem(tokenKey);
      setAuthToken(null);
    },
    clearError(state) {
      state.error = null;
    },
    setUser(state, action) {
      state.user = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadStoredAuth.pending, (state) => {
        state.loading = true;
      })
      .addCase(loadStoredAuth.fulfilled, (state, action) => {
        state.loading = false;
        state.initialized = true;
        if (action.payload) {
          state.token = action.payload.token;
          state.user = action.payload.user;
        }
      })
      .addCase(loadStoredAuth.rejected, (state) => {
        state.loading = false;
        state.initialized = true;
      })
      .addCase(loginThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.token = action.payload.token;
        state.user = action.payload.user;
      })
      .addCase(loginThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(registerThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.token = action.payload.token;
        state.user = action.payload.user;
      })
      .addCase(registerThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(refreshMeThunk.fulfilled, (state, action) => {
        if (action.payload) state.user = action.payload;
      });
  },
});

export const { logout, clearError, setUser } = authSlice.actions;
export default authSlice.reducer;
