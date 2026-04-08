import { Project } from '../models/Project.js';
import { Workspace } from '../models/Workspace.js';

async function loadProjectMembership(projectId, userId) {
  const project = await Project.findById(projectId);
  if (!project) return { error: 'Project not found', project: null, membership: null, workspace: null };
  const membership = project.members.find((m) => m.user.toString() === userId.toString());
  if (!membership) {
    return { error: 'Not a project member', project, membership: null, workspace: null };
  }
  let workspace = null;
  if (project.workspaceId) {
    workspace = await Workspace.findById(project.workspaceId);
    if (!workspace) {
      return { error: 'Workspace not found', project, membership: null, workspace: null };
    }
    const wsMember = workspace.members.find((m) => m.user.toString() === userId.toString());
    if (!wsMember) {
      return { error: 'Not a workspace member', project, membership, workspace: null };
    }
  }
  return { error: null, project, membership, workspace };
}

export function requireProjectMember() {
  return async (req, res, next) => {
    const projectId = req.params.projectId || req.body.projectId || req.query.projectId;
    if (!projectId) {
      return res.status(400).json({ message: 'projectId is required' });
    }
    const { error, project, membership, workspace } = await loadProjectMembership(projectId, req.user._id);
    if (error) {
      const status = error === 'Project not found' || error === 'Workspace not found' ? 404 : 403;
      return res.status(status).json({ message: error });
    }
    req.project = project;
    req.projectRole = membership.role;
    req.workspace = workspace;
    next();
  };
}

export function requireProjectAdmin() {
  return async (req, res, next) => {
    const projectId = req.params.projectId || req.body.projectId || req.query.projectId;
    if (!projectId) {
      return res.status(400).json({ message: 'projectId is required' });
    }
    const { error, project, membership, workspace } = await loadProjectMembership(projectId, req.user._id);
    if (error) {
      const status = error === 'Project not found' || error === 'Workspace not found' ? 404 : 403;
      return res.status(status).json({ message: error });
    }
    if (membership.role !== 'admin') {
      return res.status(403).json({ message: 'Project admin only' });
    }
    req.project = project;
    req.projectRole = 'admin';
    req.workspace = workspace;
    next();
  };
}

/** Task routes: resolve project from task */
export async function attachProjectFromTask(req, res, next) {
  try {
    const { Task } = await import('../models/Task.js');
    const taskId = req.params.taskId || req.body.taskId || req.query.taskId;
    if (!taskId) {
      return res.status(400).json({ message: 'taskId is required' });
    }
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    req.task = task;
    const { error, project, membership, workspace } = await loadProjectMembership(task.projectId, req.user._id);
    if (error) {
      const status = error === 'Project not found' || error === 'Workspace not found' ? 404 : 403;
      return res.status(status).json({ message: error });
    }
    req.project = project;
    req.projectRole = membership.role;
    req.workspace = workspace;
    next();
  } catch (e) {
    next(e);
  }
}

export function requireTaskProjectAdmin() {
  return async (req, res, next) => {
    if (req.projectRole !== 'admin') {
      return res.status(403).json({ message: 'Only project admins can perform this action' });
    }
    next();
  };
}
