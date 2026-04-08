import { validationResult } from 'express-validator';
import { Comment } from '../models/Comment.js';
import { Task } from '../models/Task.js';
import { Project } from '../models/Project.js';
import { logActivity } from '../services/activity.js';
import { emitToProject, emitToUser } from '../socket/index.js';

function toTree(comments) {
  const byId = new Map();
  comments.forEach((c) => {
    byId.set(c._id.toString(), { ...c, replies: [] });
  });
  const roots = [];
  byId.forEach((node) => {
    const parentId = node.parentComment?._id?.toString() || node.parentComment?.toString() || null;
    if (parentId && byId.has(parentId)) {
      byId.get(parentId).replies.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
}

async function assertProjectMember(projectId, userId) {
  const proj = await Project.findById(projectId);
  if (!proj) return { ok: false, status: 404, message: 'Project not found' };
  const ok = proj.members.some((m) => m.user.toString() === userId.toString());
  if (!ok) return { ok: false, status: 403, message: 'Not a project member' };
  return { ok: true, project: proj };
}

export async function addComment(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { taskId, text, parentComment } = req.body;
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    const access = await assertProjectMember(task.projectId, req.user._id);
    if (!access.ok) {
      return res.status(access.status).json({ message: access.message });
    }
    if (parentComment) {
      const parent = await Comment.findOne({ _id: parentComment, taskId });
      if (!parent) {
        return res.status(400).json({ message: 'Invalid parent comment' });
      }
    }
    const comment = await Comment.create({
      text,
      user: req.user._id,
      taskId,
      parentComment: parentComment || null,
    });
    const populated = await Comment.findById(comment._id).populate('user', 'name email avatarUrl');
    await logActivity({
      action: `${req.user.name} added a comment`,
      userId: req.user._id,
      taskId,
      projectId: task.projectId,
      metadata: { commentId: comment._id },
    });
    emitToProject(task.projectId.toString(), 'comment:added', {
      taskId: task._id.toString(),
      comment: populated,
    });
    if (task.assignedTo && task.assignedTo.toString() !== req.user._id.toString()) {
      emitToUser(task.assignedTo.toString(), 'notification', {
        type: 'comment_added',
        message: `${req.user.name} commented on "${task.title}"`,
        taskId: task._id,
        projectId: task.projectId,
      });
    }
    res.status(201).json({ comment: populated });
  } catch (e) {
    next(e);
  }
}

export async function listComments(req, res, next) {
  try {
    const { taskId } = req.params;
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    const access = await assertProjectMember(task.projectId, req.user._id);
    if (!access.ok) {
      return res.status(access.status).json({ message: access.message });
    }
    const raw = await Comment.find({ taskId })
      .populate('user', 'name email avatarUrl')
      .sort({ createdAt: 1 })
      .lean();
    const tree = toTree(raw);
    res.json({ comments: tree });
  } catch (e) {
    next(e);
  }
}
