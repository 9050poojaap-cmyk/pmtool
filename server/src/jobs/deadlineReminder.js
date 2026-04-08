import { Task } from '../models/Task.js';
import { notifyDeadlineReminder } from '../services/mailer.js';

const reminded = new Set();

function dayKey(d) {
  return new Date(d).toISOString().slice(0, 10);
}

export function startDeadlineReminderJob() {
  const intervalMs = Number(process.env.DEADLINE_CHECK_MS || 60 * 60 * 1000);
  setInterval(async () => {
    try {
      const now = new Date();
      const horizon = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const tasks = await Task.find({
        dueDate: { $gte: now, $lte: horizon },
        status: { $ne: 'Done' },
        assignedTo: { $ne: null },
      }).populate('assignedTo', 'name email');
      for (const t of tasks) {
        const u = t.assignedTo;
        if (!u?.email) continue;
        const key = `${t._id}:${dayKey(t.dueDate)}`;
        if (reminded.has(key)) continue;
        reminded.add(key);
        await notifyDeadlineReminder({
          to: u.email,
          name: u.name,
          taskTitle: t.title,
          dueDate: t.dueDate.toISOString(),
        });
      }
      if (reminded.size > 5000) reminded.clear();
    } catch (e) {
      console.error('[deadlineReminder]', e);
    }
  }, intervalMs);
  console.log(`Deadline reminder job every ${intervalMs}ms`);
}
