import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { clearError, loginThunk } from '../store/authSlice';

export default function LoginPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { token, loading, error } = useSelector((s) => s.auth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (token) navigate('/');
  }, [token, navigate]);

  useEffect(() => () => dispatch(clearError()), [dispatch]);

  async function onSubmit(e) {
    e.preventDefault();
    const res = await dispatch(loginThunk({ email, password }));
    if (!res.error) navigate('/');
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-xl">
        <h1 className="text-2xl font-bold mb-1">Welcome back</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">Sign in to continue</p>
        <form onSubmit={onSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 px-3 py-2 text-sm">
              {error}
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Email
            </label>
            <input
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Password
            </label>
            <input
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-sky-600 hover:bg-sky-500 text-white py-2.5 font-medium disabled:opacity-60"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
          No account?{' '}
          <Link to="/register" className="text-sky-600 dark:text-sky-400 font-medium">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
