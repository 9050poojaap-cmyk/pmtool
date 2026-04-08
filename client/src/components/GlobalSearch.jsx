import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { miscApi } from '../api/services';

export default function GlobalSearch() {
  const navigate = useNavigate();
  const workspaceId = useSelector((s) => s.workspaces.activeId);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [comments, setComments] = useState([]);

  useEffect(() => {
    if (q.trim().length < 2) {
      setTasks([]);
      setComments([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const { data } = await miscApi.search({
          q: q.trim(),
          ...(workspaceId ? { workspaceId } : {}),
        });
        setTasks(data.tasks || []);
        setComments(data.comments || []);
        setOpen(true);
      } catch {
        setTasks([]);
        setComments([]);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [q, workspaceId]);

  return (
    <div className="relative flex-1 max-w-md mx-4 min-w-[120px]">
      <input
        type="search"
        className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-1.5 text-sm"
        placeholder="Search tasks & comments…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => q.length >= 2 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
      />
      {open && (tasks.length > 0 || comments.length > 0) && (
        <div className="absolute top-full left-0 right-0 mt-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg max-h-80 overflow-y-auto z-50 text-sm">
          {tasks.length > 0 && (
            <div className="p-2 border-b border-slate-100 dark:border-slate-800 font-medium text-xs text-slate-500">
              Tasks
            </div>
          )}
          {tasks.map((t) => (
            <button
              key={t._id}
              type="button"
              className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800"
              onClick={() => {
                const p = t.projectId?._id || t.projectId;
                if (p) navigate(`/project/${p}/board`);
              }}
            >
              {t.title}
            </button>
          ))}
          {comments.length > 0 && (
            <div className="p-2 border-b border-slate-100 dark:border-slate-800 font-medium text-xs text-slate-500">
              Comments
            </div>
          )}
          {comments.map((c) => (
            <button
              key={c._id}
              type="button"
              className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 line-clamp-2"
              onClick={() => {
                const p = c.taskId?.projectId?._id || c.taskId?.projectId;
                if (p) navigate(`/project/${p}/board`);
              }}
            >
              {c.text}
            </button>
          ))}
          <div className="p-2 text-xs text-slate-400">
            Workspace filter: {workspaceId || 'all'}
          </div>
        </div>
      )}
    </div>
  );
}
