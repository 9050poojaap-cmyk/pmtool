import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout, refreshMeThunk } from '../store/authSlice';
import { toggleDarkMode } from '../store/uiSlice';
import { disconnectSocket } from '../socket';
import GlobalSearch from './GlobalSearch';
import { authApi } from '../api/services';

export default function AppLayout() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((s) => s.auth.user);
  const dark = useSelector((s) => s.ui.darkMode);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-6">
          <NavLink to="/" className="font-semibold text-sky-700 dark:text-sky-400">
            PM Tool
          </NavLink>
          <nav className="flex gap-4 text-sm items-center">
            <NavLink
              to="/"
              className={({ isActive }) =>
                isActive
                  ? 'text-sky-600 dark:text-sky-400 font-medium'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }
              end
            >
              Projects
            </NavLink>
            <NavLink
              to="/messages"
              className={({ isActive }) =>
                isActive
                  ? 'text-sky-600 dark:text-sky-400 font-medium'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }
            >
              Messages
            </NavLink>
            <GlobalSearch />
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <button
              type="button"
              onClick={() => dispatch(toggleDarkMode())}
              className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Toggle dark mode"
            >
              {dark ? 'Light' : 'Dark'}
            </button>
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt=""
                className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700"
              />
            ) : (
              <span className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-medium">
                {(user?.name || '?').slice(0, 1)}
              </span>
            )}
            <label className="cursor-pointer text-xs text-sky-600 dark:text-sky-400">
              Avatar
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    await authApi.uploadAvatar(f);
                    dispatch(refreshMeThunk());
                  }
                  e.target.value = '';
                }}
              />
            </label>
            <span className="text-slate-600 dark:text-slate-400 hidden sm:inline">{user?.name}</span>
            <button
              type="button"
              onClick={() => {
                dispatch(logout());
                disconnectSocket();
                navigate('/login');
              }}
              className="rounded-lg bg-slate-900 text-white dark:bg-sky-600 px-3 py-1.5"
            >
              Log out
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
