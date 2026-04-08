import { ActivityLog } from '../models/ActivityLog.js';

export async function logActivity({ action, userId, taskId, projectId, metadata }) {
  await ActivityLog.create({
    action,
    user: userId,
    taskId: taskId || null,
    projectId: projectId || null,
    metadata: metadata || {},
  });
}
