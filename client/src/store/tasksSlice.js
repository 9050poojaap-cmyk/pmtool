import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { taskApi } from '../api/services';

export const fetchTasks = createAsyncThunk(
  'tasks/fetchAll',
  async ({ projectId, ...params }, { rejectWithValue }) => {
    try {
      const { data } = await taskApi.list(projectId, { limit: 500, ...params });
      return { projectId, ...data };
    } catch (e) {
      return rejectWithValue(e.response?.data?.message || 'Failed to load tasks');
    }
  }
);

const tasksSlice = createSlice({
  name: 'tasks',
  initialState: {
    projectId: null,
    items: [],
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
    loading: false,
    error: null,
    filters: {
      status: '',
      priority: '',
      assignedTo: '',
      search: '',
      label: '',
    },
  },
  reducers: {
    setFilters(state, action) {
      state.filters = { ...state.filters, ...action.payload };
    },
    mergeTask(state, action) {
      const task = action.payload;
      const pid = task.projectId?._id || task.projectId;
      if (state.projectId && pid && String(pid) !== String(state.projectId)) return;
      const id = task._id?.toString();
      const idx = state.items.findIndex((t) => String(t._id) === id);
      if (idx === -1) state.items.push(task);
      else state.items[idx] = { ...state.items[idx], ...task };
      state.items.sort((a, b) => {
        if (a.status !== b.status) return String(a.status).localeCompare(String(b.status));
        return (a.position ?? 0) - (b.position ?? 0);
      });
    },
    removeTask(state, action) {
      const id = action.payload;
      state.items = state.items.filter((t) => t._id !== id);
    },
    replaceColumn(state, action) {
      const { status, tasks } = action.payload;
      state.items = state.items.filter((t) => t.status !== status).concat(tasks);
      state.items.sort((a, b) => {
        if (a.status !== b.status) return String(a.status).localeCompare(String(b.status));
        return (a.position ?? 0) - (b.position ?? 0);
      });
    },
    setTasksFromServer(state, action) {
      state.items = action.payload.tasks;
    },
    clearTasks(state) {
      state.items = [];
      state.projectId = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTasks.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTasks.fulfilled, (state, action) => {
        state.loading = false;
        state.projectId = action.payload.projectId;
        state.items = action.payload.tasks;
        state.page = action.payload.page;
        state.limit = action.payload.limit;
        state.total = action.payload.total;
        state.totalPages = action.payload.totalPages;
      })
      .addCase(fetchTasks.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { setFilters, mergeTask, removeTask, replaceColumn, setTasksFromServer, clearTasks } =
  tasksSlice.actions;
export default tasksSlice.reducer;
