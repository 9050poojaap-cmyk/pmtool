import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from 'recharts';
import { miscApi } from '../api/services';

const COLORS = ['#0ea5e9', '#6366f1', '#22c55e', '#f97316', '#a855f7'];

export default function AnalyticsPage() {
  const { projectId } = useOutletContext();
  const [data, setData] = useState(null);
  const [burn, setBurn] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [a, b] = await Promise.all([
          miscApi.analytics(projectId),
          miscApi.burndown(projectId, 14),
        ]);
        if (!cancelled) {
          setData(a.data);
          setBurn(b.data);
        }
      } catch {
        if (!cancelled) {
          setData(null);
          setBurn(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  async function downloadPdf() {
    try {
      await miscApi.downloadPdf(projectId);
    } catch {
      /* toast optional */
    }
  }

  if (!data) {
    return <div className="p-6 text-slate-500">Loading analytics…</div>;
  }

  const pieData = Object.entries(data.statusBreakdown || {}).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={downloadPdf}
          className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-medium"
        >
          Export PDF report
        </button>
      </div>
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-900">
          <div className="text-xs text-slate-500 uppercase tracking-wide">Total tasks</div>
          <div className="text-3xl font-bold mt-1">{data.total}</div>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-900">
          <div className="text-xs text-slate-500 uppercase tracking-wide">Completed</div>
          <div className="text-3xl font-bold mt-1 text-emerald-600">{data.completed}</div>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-900">
          <div className="text-xs text-slate-500 uppercase tracking-wide">Productivity</div>
          <div className="text-3xl font-bold mt-1 text-sky-600">{data.productivity}%</div>
        </div>
      </div>

      {burn?.series?.length ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-900 h-80">
          <h3 className="text-sm font-semibold mb-4">Burn-down (task count)</h3>
          <ResponsiveContainer width="100%" height="85%">
            <LineChart data={burn.series}>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="remaining" name="Remaining" stroke="#0ea5e9" strokeWidth={2} dot={false} />
              <Line
                type="monotone"
                dataKey="idealRemaining"
                name="Ideal"
                stroke="#94a3b8"
                strokeDasharray="4 4"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : null}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-900 h-80">
          <h3 className="text-sm font-semibold mb-4">Tasks per assignee</h3>
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={data.tasksPerUser}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="total" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-900 h-80">
          <h3 className="text-sm font-semibold mb-4">Status mix</h3>
          <ResponsiveContainer width="100%" height="85%">
            <PieChart>
              <Pie dataKey="value" data={pieData} nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                {pieData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
