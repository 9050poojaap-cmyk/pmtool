import { useDispatch, useSelector } from 'react-redux';
import { dismissNotification } from '../store/uiSlice';

export default function NotificationsHost() {
  const dispatch = useDispatch();
  const items = useSelector((s) => s.ui.notifications);
  if (!items.length) return null;
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {items.map((n) => (
        <button
          type="button"
          key={n.id}
          onClick={() => dispatch(dismissNotification(n.id))}
          className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg px-4 py-3 text-left text-sm text-slate-800 dark:text-slate-100"
        >
          <div className="font-medium">{n.type?.replace('_', ' ')}</div>
          <div className="text-slate-600 dark:text-slate-300">{n.message}</div>
        </button>
      ))}
    </div>
  );
}
