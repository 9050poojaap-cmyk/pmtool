import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import uiReducer from './uiSlice';
import tasksReducer from './tasksSlice';
import projectsReducer from './projectsSlice';
import workspaceReducer from './workspaceSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    ui: uiReducer,
    tasks: tasksReducer,
    projects: projectsReducer,
    workspaces: workspaceReducer,
  },
});
