import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { projectApi } from '../api/services';
import { fetchProject } from '../store/projectsSlice';

export default function ProjectSettings({ projectId }) {
  const dispatch = useDispatch();
  const project = useSelector((s) => s.projects.current);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const [title, setTitle] = useState(project?.title || '');
  const [description, setDescription] = useState(project?.description || '');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setTitle(project?.title || '');
    setDescription(project?.description || '');
  }, [project?._id, project?.title, project?.description]);

  async function addMember(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await projectApi.addMember({ projectId, email, role });
      setEmail('');
      await dispatch(fetchProject(projectId));
    } finally {
      setBusy(false);
    }
  }

  async function saveProject(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await projectApi.update(projectId, { title, description });
      await dispatch(fetchProject(projectId));
    } finally {
      setBusy(false);
    }
  }

  async function removeMember(userId) {
    if (!window.confirm('Remove this member?')) return;
    await projectApi.removeMember(projectId, userId);
    await dispatch(fetchProject(projectId));
  }

  async function changeRole(userId, newRole) {
    await projectApi.updateMemberRole(projectId, userId, newRole);
    await dispatch(fetchProject(projectId));
  }

  return (
    <div className="mb-6 rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-900">
      <h2 className="font-semibold mb-3">Project settings (admin)</h2>
      <form onSubmit={saveProject} className="grid sm:grid-cols-2 gap-3 mb-6">
        <div>
          <label className="text-xs text-slate-500">Title</label>
          <input
            className="w-full mt-1 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 bg-white dark:bg-slate-950 text-sm"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs text-slate-500">Description</label>
          <textarea
            className="w-full mt-1 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 bg-white dark:bg-slate-950 text-sm"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-slate-900 dark:bg-sky-600 text-white text-sm px-4 py-2"
          >
            Save project
          </button>
        </div>
      </form>

      <h3 className="text-sm font-medium mb-2">Members</h3>
      <ul className="space-y-2 mb-4">
        {(project?.members || []).map((m) => (
          <li
            key={String(m.user?._id || m.user)}
            className="flex flex-wrap items-center gap-2 text-sm border border-slate-100 dark:border-slate-800 rounded-lg px-3 py-2"
          >
            <span className="font-medium">{m.user?.name}</span>
            <span className="text-slate-500">{m.user?.email}</span>
            <select
              className="ml-auto rounded border border-slate-200 dark:border-slate-700 bg-transparent text-xs"
              value={m.role}
              onChange={(e) => changeRole(m.user._id, e.target.value)}
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
            <button
              type="button"
              className="text-red-600 text-xs"
              onClick={() => removeMember(m.user._id)}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>

      <form onSubmit={addMember} className="flex flex-wrap gap-2 items-end">
        <div>
          <label className="text-xs text-slate-500 block">Invite by email</label>
          <input
            className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm w-64"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@company.com"
          />
        </div>
        <select
          className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          <option value="member">Member</option>
          <option value="admin">Admin</option>
        </select>
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-sky-600 text-white text-sm px-4 py-2"
        >
          Add member
        </button>
      </form>
      <p className="text-xs text-slate-500 mt-2">
        Tip: search registered users via{' '}
        <code>/users/search?q=</code> in the API; invite matches must be existing accounts.
      </p>
    </div>
  );
}
