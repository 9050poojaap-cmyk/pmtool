import { useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchTasks } from '../store/tasksSlice';

function toYMD(d) {
  return new Date(d).toISOString().slice(0, 10);
}

export default function GanttPage() {
  const { projectId } = useOutletContext();
  const dispatch = useDispatch();
  const items = useSelector((s) => s.tasks.items);
  const containerRef = useRef(null);
  const ganttRef = useRef(null);

  useEffect(() => {
    dispatch(fetchTasks({ projectId, limit: 500 }));
  }, [dispatch, projectId]);

  useEffect(() => {
    const GanttCtor = typeof window !== 'undefined' ? window.Gantt : null;
    if (!containerRef.current || !items.length || !GanttCtor) return;
    const tasks = items.map((t) => {
      const start = t.createdAt ? new Date(t.createdAt) : new Date();
      const end = t.dueDate
        ? new Date(t.dueDate)
        : new Date(start.getTime() + 7 * 86400000);
      let progress = 0;
      if (t.status === 'Done') progress = 100;
      else if (t.status === 'In Progress') progress = 45;
      return {
        id: String(t._id),
        name: t.title,
        start: toYMD(start),
        end: toYMD(end < start ? new Date(start.getTime() + 86400000) : end),
        progress,
      };
    });
    containerRef.current.innerHTML = '';
    ganttRef.current = new GanttCtor(containerRef.current, tasks, {
      view_mode: 'Week',
      bar_height: 22,
      padding: 16,
    });
    return () => {
      ganttRef.current = null;
    };
  }, [items]);

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 overflow-x-auto">
      <h2 className="text-sm font-semibold mb-4">Gantt (from created → due dates)</h2>
      {!items.length && (
        <p className="text-sm text-slate-500">No tasks to plot. Add tasks on the board.</p>
      )}
      {typeof window !== 'undefined' && !window.Gantt && (
        <p className="text-sm text-amber-600">Gantt library failed to load (check network / CDN).</p>
      )}
      <div ref={containerRef} className="gantt-target min-h-[280px]" />
    </div>
  );
}
