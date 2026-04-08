import { useEffect, Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { loadStoredAuth } from './store/authSlice';
import { connectSocket, disconnectSocket } from './socket';
import AppLayout from './components/AppLayout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import DirectMessagesPage from './pages/DirectMessagesPage';
import ProjectPage from './pages/ProjectPage';
import BoardTab from './pages/BoardTab';
import ProjectChat from './components/ProjectChat';
import NotificationsHost from './components/NotificationsHost';

const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));
const ActivityPage = lazy(() => import('./pages/ActivityPage'));
const GanttPage = lazy(() => import('./pages/GanttPage'));

function PrivateRoute({ children }) {
  const { token, initialized } = useSelector((s) => s.auth);
  if (!initialized) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-600 dark:text-slate-300">
        Loading…
      </div>
    );
  }
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default function App() {
  const dispatch = useDispatch();
  const token = useSelector((s) => s.auth.token);

  useEffect(() => {
    dispatch(loadStoredAuth());
  }, [dispatch]);

  useEffect(() => {
    if (!token) {
      disconnectSocket();
      return undefined;
    }
    connectSocket(token);
    return () => disconnectSocket();
  }, [token]);

  return (
    <>
      <NotificationsHost />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <AppLayout />
            </PrivateRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="messages" element={<DirectMessagesPage />} />
          <Route path="project/:projectId" element={<ProjectPage />}>
            <Route index element={<Navigate to="board" replace />} />
            <Route path="board" element={<BoardTab />} />
            <Route path="chat" element={<ProjectChat />} />
            <Route
              path="analytics"
              element={
                <Suspense fallback={<PageLoading />}>
                  <AnalyticsPage />
                </Suspense>
              }
            />
            <Route
              path="activity"
              element={
                <Suspense fallback={<PageLoading />}>
                  <ActivityPage />
                </Suspense>
              }
            />
            <Route
              path="gantt"
              element={
                <Suspense fallback={<PageLoading />}>
                  <GanttPage />
                </Suspense>
              }
            />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

function PageLoading() {
  return (
    <div className="p-8 text-center text-slate-500 dark:text-slate-400">Loading…</div>
  );
}
