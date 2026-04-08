import { Project } from '../models/Project.js';
import { Task } from '../models/Task.js';
import { Comment } from '../models/Comment.js';

export async function smartSearch(req, res, next) {
  try {
    const q = (req.query.q || '').trim();
    if (q.length < 2) {
      return res.status(400).json({ message: 'Query must be at least 2 characters' });
    }
    const { workspaceId } = req.query;
    const projects = await Project.find({ 'members.user': req.user._id }).select('_id workspaceId').lean();
    let projectIds = projects.map((p) => p._id);
    if (workspaceId) {
      projectIds = projects
        .filter((p) => p.workspaceId && String(p.workspaceId) === String(workspaceId))
        .map((p) => p._id);
    }
    if (!projectIds.length) {
      return res.json({ tasks: [], comments: [], query: q });
    }
    const [tasks, commentTaskIds] = await Promise.all([
      Task.find({
        $text: { $search: q },
        projectId: { $in: projectIds },
      })
        .select('title description labels status priority projectId')
        .populate('projectId', 'title')
        .limit(40)
        .lean(),
      Task.find({ projectId: { $in: projectIds } }).distinct('_id'),
    ]);
    const comments = await Comment.find({
      $text: { $search: q },
      taskId: { $in: commentTaskIds },
    })
      .select('text taskId createdAt')
      .populate('user', 'name email avatarUrl')
      .populate('taskId', 'title projectId')
      .limit(40)
      .lean();
    res.json({ tasks, comments, query: q });
  } catch (e) {
    next(e);
  }
}
