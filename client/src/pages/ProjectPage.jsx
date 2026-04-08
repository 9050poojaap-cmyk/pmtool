import { useEffect } from 'react';
import { NavLink, Outlet, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProject } from '../store/projectsSlice';
import { joinProjectRoom } from '../socket';
import { clearTasks } from '../store/tasksSlice';

const baseTabs = [
  { to: 'board', label: 'Board', key: 'board' },
  { to: 'analytics', label: 'Analytics', key: 'analytics', plugin: 'analytics' },
  { to: 'activity', label: 'Activity', key: 'activity' },
  { to: 'gantt', label: 'Gantt', key: 'gantt' },
];

export default function ProjectPage() {
  const { projectId } = useParams();
  const dispatch = useDispatch();
  const project = useSelector((s) => s.projects.current);
  const plugins = project?.workspaceId?.plugins;
  const chatOn = plugins?.chat !== false;
  const analyticsOn = plugins?.analytics !== false;
  const tabs = [
    ...baseTabs.filter((t) => {
      if (t.key === 'analytics' && analyticsOn === false) return false;
      return true;
    }),
    ...(chatOn ? [{ to: 'chat', label: 'Chat', key: 'chat' }] : []),
  ];

  useEffect(() => {
    if (projectId) {
      dispatch(fetchProject(projectId));
      joinProjectRoom(projectId);
    }
    return () => {
      dispatch(clearTasks());
    };
  }, [dispatch, projectId]);

  return (
    <div className="max-w-[1600px] mx-auto px-4 py-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">{project?.title || 'Project'}</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 max-w-2xl">
            {project?.description || ''}
          </p>
        </div>
      </div>
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800 mb-6 overflow-x-auto">
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            className={({ isActive }) =>
              `px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 -mb-px whitespace-nowrap ${
                isActive
                  ? 'border-sky-600 text-sky-700 dark:text-sky-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`
            }
          >
            {t.label}
          </NavLink>
        ))}
      </div>
      <Outlet context={{ projectId }} />
    </div>
  );
}
