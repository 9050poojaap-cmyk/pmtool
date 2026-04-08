import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { projectApi } from '../api/services';

export const fetchProjects = createAsyncThunk(
  'projects/fetch',
  async (workspaceId, { rejectWithValue }) => {
    try {
      const { data } = await projectApi.list(
        workspaceId ? { params: { workspaceId } } : {}
      );
      return data.projects;
    } catch (e) {
      return rejectWithValue(e.response?.data?.message || 'Failed');
    }
  }
);

export const fetchProject = createAsyncThunk(
  'projects/fetchOne',
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await projectApi.get(id);
      return data.project;
    } catch (e) {
      return rejectWithValue(e.response?.data?.message || 'Failed');
    }
  }
);

export const createProjectThunk = createAsyncThunk(
  'projects/create',
  async (body, { rejectWithValue }) => {
    try {
      const { data } = await projectApi.create(body);
      return data.project;
    } catch (e) {
      return rejectWithValue(e.response?.data?.message || 'Failed');
    }
  }
);

const projectsSlice = createSlice({
  name: 'projects',
  initialState: {
    list: [],
    current: null,
    loading: false,
    error: null,
  },
  reducers: {
    clearCurrent(state) {
      state.current = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProjects.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchProjects.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload;
      })
      .addCase(fetchProjects.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchProject.fulfilled, (state, action) => {
        state.current = action.payload;
      })
      .addCase(createProjectThunk.fulfilled, (state, action) => {
        state.list = [action.payload, ...state.list];
      });
  },
});

export const { clearCurrent } = projectsSlice.actions;
export default projectsSlice.reducer;
