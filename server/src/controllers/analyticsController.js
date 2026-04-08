import { Task } from '../models/Task.js';

export async function projectAnalytics(req, res, next) {
  try {
    const projectId = req.params.projectId;
    const all = await Task.find({ projectId }).populate('assignedTo', 'name email').lean();
    const total = all.length;
    const completed = all.filter((t) => t.status === 'Done').length;
    const productivity = total === 0 ? 0 : Math.round((completed / total) * 100);
    const byUserMap = new Map();
    all.forEach((t) => {
      const key = t.assignedTo?._id?.toString() || 'unassigned';
      const name = t.assignedTo?.name || 'Unassigned';
      if (!byUserMap.has(key)) {
        byUserMap.set(key, { userId: key, name, total: 0, todo: 0, inProgress: 0, done: 0 });
      }
      const row = byUserMap.get(key);
      row.total += 1;
      if (t.status === 'Done') row.done += 1;
      else if (t.status === 'In Progress') row.inProgress += 1;
      else row.todo += 1;
    });
    const tasksPerUser = Array.from(byUserMap.values());
    const statusBreakdown = {
      'To Do': all.filter((t) => t.status === 'To Do').length,
      'In Progress': all.filter((t) => t.status === 'In Progress').length,
      Done: all.filter((t) => t.status === 'Done').length,
    };
    res.json({
      total,
      completed,
      productivity,
      tasksPerUser,
      statusBreakdown,
    });
  } catch (e) {
    next(e);
  }
}

/** Burn-down: cumulative completions vs ideal line (by task count). */
export async function projectBurndown(req, res, next) {
  try {
    const projectId = req.params.projectId;
    const days = Math.min(90, Math.max(3, parseInt(req.query.days, 10) || 14));
    const tasks = await Task.find({ projectId }).lean();
    const total = tasks.length;
    const now = new Date();
    const start = new Date(now);
    start.setUTCDate(start.getUTCDate() - (days - 1));
    start.setUTCHours(0, 0, 0, 0);
    const dayKeys = [];
    for (let i = 0; i < days; i += 1) {
      const d = new Date(start);
      d.setUTCDate(start.getUTCDate() + i);
      dayKeys.push(d.toISOString().slice(0, 10));
    }
    const completedByDay = Object.fromEntries(dayKeys.map((k) => [k, 0]));
    let initialCompleted = 0;
    tasks
      .filter((t) => t.status === 'Done' && t.updatedAt)
      .forEach((t) => {
        const doneAt = new Date(t.updatedAt);
        if (doneAt < start) {
          initialCompleted += 1;
          return;
        }
        const k = doneAt.toISOString().slice(0, 10);
        if (Object.prototype.hasOwnProperty.call(completedByDay, k)) {
          completedByDay[k] += 1;
        }
      });
    let cumulative = initialCompleted;
    const series = dayKeys.map((key, dayIndex) => {
      cumulative += completedByDay[key] || 0;
      const remaining = Math.max(0, total - cumulative);
      const idealRemaining = Math.max(0, Math.round(total - (total * (dayIndex + 1)) / days));
      return {
        date: key,
        completedToday: completedByDay[key] || 0,
        cumulativeCompleted: cumulative,
        remaining,
        idealRemaining,
      };
    });
    res.json({ total, days, series });
  } catch (e) {
    next(e);
  }
}
