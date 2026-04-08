import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { fetchProjects, createProjectThunk } from '../store/projectsSlice';
import {
  fetchWorkspaces,
  createWorkspaceThunk,
  setActiveWorkspaceId,
  updateWorkspacePluginsThunk,
} from '../store/workspaceSlice';

export default function DashboardPage() {
  const dispatch = useDispatch();
  const { list, loading } = useSelector((s) => s.projects);
  const { list: workspaces, activeId, loading: wsLoading } = useSelector((s) => s.workspaces);
  const user = useSelector((s) => s.auth.user);
  const activeWs = workspaces.find((w) => String(w._id) === String(activeId));
  const wsRole = activeWs?.members?.find(
    (m) => String(m.user?._id || m.user) === String(user?._id)
  )?.role;
  const canManagePlugins = wsRole === 'owner' || wsRole === 'admin';
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [open, setOpen] = useState(false);
  const [wsName, setWsName] = useState('');
  const [wsOpen, setWsOpen] = useState(false);

  useEffect(() => {
    dispatch(fetchWorkspaces());
  }, [dispatch]);

  useEffect(() => {
    dispatch(fetchProjects(activeId || undefined));
  }, [dispatch, activeId]);

  async function create(e) {
    e.preventDefault();
    const res = await dispatch(
      createProjectThunk({
        title,
        description: desc,
        ...(activeId ? { workspaceId: activeId } : {}),
      })
    );
    if (!res.error) {
      setTitle('');
      setDesc('');
      setOpen(false);
    }
  }

  async function createWs(e) {
    e.preventDefault();
    const res = await dispatch(createWorkspaceThunk({ name: wsName }));
    if (!res.error) {
      setWsName('');
      setWsOpen(false);
      dispatch(setActiveWorkspaceId(res.payload._id));
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Your projects</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Workspaces group projects. Filter by workspace or stay unfiltered for all projects.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setWsOpen(true)}
            className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-medium"
          >
            New workspace
          </button>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-lg bg-sky-600 hover:bg-sky-500 text-white px-4 py-2 text-sm font-medium"
          >
            New project
          </button>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span className="text-sm text-slate-500">Workspace:</span>
        <button
          type="button"
          className={`text-sm px-3 py-1 rounded-lg border ${!activeId ? 'border-sky-600 bg-sky-50 dark:bg-sky-950' : 'border-slate-200 dark:border-slate-700'}`}
          onClick={() => dispatch(setActiveWorkspaceId(''))}
        >
          All
        </button>
        {wsLoading && <span className="text-sm text-slate-500">Loading…</span>}
        {workspaces.map((w) => (
          <button
            key={w._id}
            type="button"
            className={`text-sm px-3 py-1 rounded-lg border ${
              activeId === w._id
                ? 'border-sky-600 bg-sky-50 dark:bg-sky-950'
                : 'border-slate-200 dark:border-slate-700'
            }`}
            onClick={() => dispatch(setActiveWorkspaceId(w._id))}
          >
            {w.name}
          </button>
        ))}
      </div>

      {activeWs && canManagePlugins && (
        <div className="mb-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <h3 className="text-sm font-semibold mb-2">Workspace feature plugins</h3>
          <p className="text-xs text-slate-500 mb-3">
            Turn modules on or off for projects in this workspace (chat, PDF reports, analytics).
          </p>
          <div className="flex flex-wrap gap-4 text-sm">
            {(['chat', 'reports', 'analytics']).map((key) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer capitalize">
                <input
                  type="checkbox"
                  checked={(activeWs.plugins?.[key] ?? true) !== false}
                  onChange={(e) =>
                    dispatch(
                      updateWorkspacePluginsThunk({
                        workspaceId: activeId,
                        plugins: { [key]: e.target.checked },
                      })
                    )
                  }
                />
                {key}
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-4 mb-8">
        <h2 className="text-lg font-semibold">Projects</h2>
      </div>

      {loading && <p className="text-slate-500">Loading projects…</p>}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map((p) => (
          <Link
            key={p._id}
            to={`/project/${p._id}/board`}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 hover:border-sky-400 dark:hover:border-sky-500 transition-colors"
          >
            <h2 className="font-semibold text-lg">{p.title}</h2>
            {p.workspaceId?.name && (
              <p className="text-xs text-sky-600 dark:text-sky-400 mt-1">{p.workspaceId.name}</p>
            )}
            <p className="text-slate-600 dark:text-slate-400 text-sm mt-2 line-clamp-2">
              {p.description || 'No description'}
            </p>
          </Link>
        ))}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xl">
            <h2 className="text-lg font-semibold mb-4">New project</h2>
            <form onSubmit={create} className="space-y-3">
              {activeId && (
                <p className="text-xs text-slate-500">
                  Will be created in the selected workspace.
                </p>
              )}
              <input
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 bg-white dark:bg-slate-950"
                placeholder="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
              <textarea
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 bg-white dark:bg-slate-950"
                placeholder="Description"
                rows={3}
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 rounded-lg bg-sky-600 text-white font-medium">
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {wsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xl">
            <h2 className="text-lg font-semibold mb-4">New workspace</h2>
            <form onSubmit={createWs} className="space-y-3">
              <input
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 bg-white dark:bg-slate-950"
                placeholder="Workspace name"
                value={wsName}
                onChange={(e) => setWsName(e.target.value)}
                required
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700"
                  onClick={() => setWsOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 rounded-lg bg-sky-600 text-white font-medium">
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
