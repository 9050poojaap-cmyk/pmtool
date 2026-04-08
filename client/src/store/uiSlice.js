import { createSlice } from '@reduxjs/toolkit';

const key = 'pmtool_theme';

function readInitialDark() {
  const stored = localStorage.getItem(key);
  if (stored === 'dark') return true;
  if (stored === 'light') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

const initialDark = typeof window !== 'undefined' ? readInitialDark() : false;

if (typeof document !== 'undefined') {
  document.documentElement.classList.toggle('dark', initialDark);
}

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    darkMode: initialDark,
    notifications: [],
  },
  reducers: {
    toggleDarkMode(state) {
      state.darkMode = !state.darkMode;
      localStorage.setItem(key, state.darkMode ? 'dark' : 'light');
      document.documentElement.classList.toggle('dark', state.darkMode);
    },
    pushNotification(state, action) {
      state.notifications.unshift({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        ...action.payload,
        at: Date.now(),
      });
      state.notifications = state.notifications.slice(0, 20);
    },
    dismissNotification(state, action) {
      state.notifications = state.notifications.filter((n) => n.id !== action.payload);
    },
  },
});

export const { toggleDarkMode, pushNotification, dismissNotification } = uiSlice.actions;
export default uiSlice.reducer;
