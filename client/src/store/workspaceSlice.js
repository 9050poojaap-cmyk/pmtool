import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { workspaceApi } from '../api/services';

const WS_KEY = 'pmtool_workspace_id';

function readStoredId() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(WS_KEY) || '';
}

export const fetchWorkspaces = createAsyncThunk(
  'workspaces/fetch',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await workspaceApi.list();
      return data.workspaces;
    } catch (e) {
      return rejectWithValue(e.response?.data?.message || 'Failed');
    }
  }
);

export const createWorkspaceThunk = createAsyncThunk(
  'workspaces/create',
  async (body, { rejectWithValue }) => {
    try {
      const { data } = await workspaceApi.create(body);
      return data.workspace;
    } catch (e) {
      return rejectWithValue(e.response?.data?.message || 'Failed');
    }
  }
);

export const updateWorkspacePluginsThunk = createAsyncThunk(
  'workspaces/updatePlugins',
  async ({ workspaceId, plugins }, { rejectWithValue }) => {
    try {
      const { data } = await workspaceApi.updatePlugins(workspaceId, plugins);
      return data.workspace;
    } catch (e) {
      return rejectWithValue(e.response?.data?.message || 'Failed');
    }
  }
);

const workspaceSlice = createSlice({
  name: 'workspaces',
  initialState: {
    list: [],
    activeId: readStoredId(),
    loading: false,
    error: null,
  },
  reducers: {
    setActiveWorkspaceId(state, action) {
      state.activeId = action.payload || '';
      if (typeof window !== 'undefined') {
        if (action.payload) localStorage.setItem(WS_KEY, action.payload);
        else localStorage.removeItem(WS_KEY);
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchWorkspaces.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchWorkspaces.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload;
      })
      .addCase(fetchWorkspaces.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createWorkspaceThunk.fulfilled, (state, action) => {
        state.list = [action.payload, ...state.list];
      })
      .addCase(updateWorkspacePluginsThunk.fulfilled, (state, action) => {
        const w = action.payload;
        state.list = state.list.map((x) => (String(x._id) === String(w._id) ? w : x));
      });
  },
});

export const { setActiveWorkspaceId } = workspaceSlice.actions;
export default workspaceSlice.reducer;
