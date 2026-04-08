import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchTasks, setFilters } from '../store/tasksSlice';
import KanbanBoard from '../components/KanbanBoard';
import TaskDrawer from '../components/TaskDrawer';
import ProjectSettings from '../components/ProjectSettings';
import { getProjectRole } from '../utils/project';

const STATUSES = ['', 'To Do', 'In Progress', 'Done'];
const PRIORITIES = ['', 'Low', 'Medium', 'High'];
const LABELS = ['', 'Bug', 'Feature', 'Urgent'];

export default function BoardTab() {
  const { projectId } = useOutletContext();
  const dispatch = useDispatch();
  const { items, loading, filters } = useSelector((s) => s.tasks);
  const project = useSelector((s) => s.projects.current);
  const user = useSelector((s) => s.auth.user);
  const [selectedTask, setSelectedTask] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);

  const role = getProjectRole(project, user);

  useEffect(() => {
    if (!projectId) return;
    dispatch(
      fetchTasks({
        projectId,
        status: filters.status || undefined,
        priority: filters.priority || undefined,
        assignedTo: filters.assignedTo || undefined,
        label: filters.label || undefined,
        search: filters.search || undefined,
      })
    );
  }, [dispatch, projectId, filters]);

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-4 items-end">
        <div>
          <label className="text-xs text-slate-500 block mb-1">Search</label>
          <input
            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-1.5 text-sm"
            placeholder="Title…"
            value={filters.search}
            onChange={(e) => dispatch(setFilters({ search: e.target.value }))}
          />
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">Status</label>
          <select
            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-1.5 text-sm"
            value={filters.status}
            onChange={(e) => dispatch(setFilters({ status: e.target.value }))}
          >
            {STATUSES.map((s) => (
              <option key={s || 'all'} value={s}>
                {s || 'All'}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">Priority</label>
          <select
            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-1.5 text-sm"
            value={filters.priority}
            onChange={(e) => dispatch(setFilters({ priority: e.target.value }))}
          >
            {PRIORITIES.map((s) => (
              <option key={s || 'all'} value={s}>
                {s || 'All'}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">Label</label>
          <select
            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-1.5 text-sm"
            value={filters.label}
            onChange={(e) => dispatch(setFilters({ label: e.target.value }))}
          >
            {LABELS.map((s) => (
              <option key={s || 'all'} value={s}>
                {s || 'All'}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">Assignee user id</label>
          <input
            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-1.5 text-sm w-52"
            placeholder="Mongo ObjectId"
            value={filters.assignedTo}
            onChange={(e) => dispatch(setFilters({ assignedTo: e.target.value }))}
          />
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="rounded-lg bg-sky-600 text-white text-sm px-4 py-2 font-medium h-9 self-end"
        >
          New task
        </button>
      </div>

      {role === 'admin' && <ProjectSettings projectId={projectId} />}

      {loading && <p className="text-slate-500 text-sm mb-2">Refreshing tasks…</p>}

      <KanbanBoard projectId={projectId} tasks={items} onOpenTask={(t) => setSelectedTask(t)} />

      {(selectedTask || createOpen) && (
        <TaskDrawer
          projectId={projectId}
          task={createOpen ? null : selectedTask}
          isProjectAdmin={role === 'admin'}
          onClose={() => {
            setSelectedTask(null);
            setCreateOpen(false);
          }}
        />
      )}
    </div>
  );
}
