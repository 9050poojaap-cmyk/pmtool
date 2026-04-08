import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { miscApi } from '../api/services';

export default function ActivityPage() {
  const { projectId } = useOutletContext();
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], totalPages: 1 });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: d } = await miscApi.activity(projectId, { page, limit: 25 });
      if (!cancelled) setData(d);
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId, page]);

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
        <h2 className="font-semibold">Activity log</h2>
        <div className="flex gap-2 text-sm">
          <button
            type="button"
            disabled={page <= 1}
            className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 disabled:opacity-40"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Prev
          </button>
          <span className="text-slate-500">
            Page {page} / {data.totalPages}
          </span>
          <button
            type="button"
            disabled={page >= data.totalPages}
            className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 disabled:opacity-40"
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      </div>
      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
        {data.items?.map((row) => (
          <li key={row._id} className="px-4 py-3 text-sm">
            <div className="text-slate-800 dark:text-slate-100">{row.action}</div>
            <div className="text-xs text-slate-500 mt-1 flex gap-2 flex-wrap">
              <span>{row.user?.name}</span>
              <span>{new Date(row.createdAt).toLocaleString()}</span>
              {row.taskId?.title && <span>· {row.taskId.title}</span>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
