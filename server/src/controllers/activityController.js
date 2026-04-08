import { ActivityLog } from '../models/ActivityLog.js';

export async function listProjectActivity(req, res, next) {
  try {
    const projectId = req.params.projectId;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 30));
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      ActivityLog.find({ projectId })
        .populate('user', 'name email')
        .populate('taskId', 'title')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ActivityLog.countDocuments({ projectId }),
    ]);
    res.json({
      items,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (e) {
    next(e);
  }
}
