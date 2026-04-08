import cron from 'node-cron';
import { User } from '../models/User.js';
import { Task } from '../models/Task.js';
import { sendDailySummaryEmail } from '../services/mailer.js';
import { emitToUser } from '../socket/index.js';

export function startDailySummaryJob() {
  const expr = process.env.DAILY_SUMMARY_CRON || '0 8 * * *';
  cron.schedule(expr, async () => {
    try {
      const now = new Date();
      const startY = new Date(now);
      startY.setUTCDate(startY.getUTCDate() - 1);
      startY.setUTCHours(0, 0, 0, 0);
      const endY = new Date(startY);
      endY.setUTCDate(endY.getUTCDate() + 1);
      const startToday = new Date(now);
      startToday.setUTCHours(0, 0, 0, 0);
      const users = await User.find().select('_id email name').lean();
      for (const u of users) {
        const assigned = await Task.find({ assignedTo: u._id }).lean();
        const pending = assigned.filter((t) => t.status !== 'Done').length;
        const completedYesterday = assigned.filter(
          (t) =>
            t.status === 'Done' &&
            t.updatedAt &&
            new Date(t.updatedAt) >= startY &&
            new Date(t.updatedAt) < endY
        ).length;
        const overdue = assigned.filter(
          (t) =>
            t.status !== 'Done' &&
            t.dueDate &&
            new Date(t.dueDate) < startToday
        ).length;
        const payload = {
          type: 'daily_summary',
          completedYesterday,
          pending,
          overdue,
        };
        emitToUser(String(u._id), 'notification', {
          ...payload,
          message: `Daily summary: ${completedYesterday} done yesterday, ${pending} pending, ${overdue} overdue`,
        });
        await sendDailySummaryEmail({
          to: u.email,
          name: u.name,
          completedYesterday,
          pending,
          overdue,
        });
      }
    } catch (e) {
      console.error('[dailySummary]', e);
    }
  });
  console.log(`Daily summary cron: ${expr}`);
}
