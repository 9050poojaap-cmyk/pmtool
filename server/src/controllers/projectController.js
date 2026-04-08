import { validationResult } from 'express-validator';
import { Project } from '../models/Project.js';
import { User } from '../models/User.js';
import { Workspace } from '../models/Workspace.js';
import { logActivity } from '../services/activity.js';

export async function createProject(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { title, description, workspaceId } = req.body;
    let wsId = workspaceId || null;
    if (wsId) {
      const ws = await Workspace.findById(wsId);
      if (!ws) {
        return res.status(404).json({ message: 'Workspace not found' });
      }
      const ok = ws.members.some((m) => m.user.toString() === req.user._id.toString());
      if (!ok) {
        return res.status(403).json({ message: 'Not a workspace member' });
      }
    }
    const project = await Project.create({
      title,
      description: description || '',
      createdBy: req.user._id,
      workspaceId: wsId,
      members: [{ user: req.user._id, role: 'admin' }],
    });
    const populated = await Project.findById(project._id)
      .populate('createdBy', 'name email avatarUrl')
      .populate('members.user', 'name email avatarUrl')
      .populate('workspaceId', 'name plugins');
    await logActivity({
      action: `User ${req.user.name} created project "${title}"`,
      userId: req.user._id,
      projectId: project._id,
    });
    res.status(201).json({ project: populated });
  } catch (e) {
    next(e);
  }
}

export async function listProjects(req, res, next) {
  try {
    const filter = { 'members.user': req.user._id };
    if (req.query.workspaceId) {
      filter.workspaceId = req.query.workspaceId;
    }
    const projects = await Project.find(filter)
      .populate('createdBy', 'name email avatarUrl')
      .populate('members.user', 'name email avatarUrl')
      .populate('workspaceId', 'name')
      .sort({ updatedAt: -1 });
    res.json({ projects });
  } catch (e) {
    next(e);
  }
}

export async function getProject(req, res, next) {
  try {
    const project = await Project.findById(req.params.projectId)
      .populate('createdBy', 'name email avatarUrl')
      .populate('members.user', 'name email avatarUrl')
      .populate('workspaceId', 'name plugins');
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    const isMember = project.members.some((m) => m.user._id.toString() === req.user._id.toString());
    if (!isMember) {
      return res.status(403).json({ message: 'Not a project member' });
    }
    const wid = project.workspaceId?._id || project.workspaceId;
    if (wid) {
      const ws = await Workspace.findById(wid);
      if (!ws) {
        return res.status(404).json({ message: 'Workspace not found' });
      }
      const inWs = ws.members.some((m) => m.user.toString() === req.user._id.toString());
      if (!inWs) {
        return res.status(403).json({ message: 'Not a workspace member' });
      }
    }
    res.json({ project });
  } catch (e) {
    next(e);
  }
}

export async function updateProject(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { title, description } = req.body;
    const project = req.project;
    if (title !== undefined) project.title = title;
    if (description !== undefined) project.description = description;
    await project.save();
    const populated = await Project.findById(project._id)
      .populate('createdBy', 'name email avatarUrl')
      .populate('members.user', 'name email avatarUrl')
      .populate('workspaceId', 'name plugins');
    await logActivity({
      action: `User ${req.user.name} updated project "${populated.title}"`,
      userId: req.user._id,
      projectId: project._id,
    });
    res.json({ project: populated });
  } catch (e) {
    next(e);
  }
}

export async function addMember(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { email, role } = req.body;
    const userToAdd = await User.findOne({ email: email.toLowerCase() });
    if (!userToAdd) {
      return res.status(404).json({ message: 'User not found' });
    }
    const project = req.project;
    const exists = project.members.some((m) => m.user.toString() === userToAdd._id.toString());
    if (exists) {
      return res.status(409).json({ message: 'User already in project' });
    }
    if (project.workspaceId) {
      const ws = await Workspace.findById(project.workspaceId);
      const inWs = ws?.members.some((m) => m.user.toString() === userToAdd._id.toString());
      if (!inWs) {
        return res.status(403).json({ message: 'User must be a workspace member first' });
      }
    }
    const memberRole = role === 'admin' ? 'admin' : 'member';
    project.members.push({ user: userToAdd._id, role: memberRole });
    await project.save();
    const populated = await Project.findById(project._id)
      .populate('createdBy', 'name email avatarUrl')
      .populate('members.user', 'name email avatarUrl')
      .populate('workspaceId', 'name plugins');
    await logActivity({
      action: `User ${req.user.name} added ${userToAdd.name} to project`,
      userId: req.user._id,
      projectId: project._id,
      metadata: { addedUserId: userToAdd._id },
    });
    res.json({ project: populated });
  } catch (e) {
    next(e);
  }
}

export async function removeMember(req, res, next) {
  try {
    const { userId } = req.params;
    const project = req.project;
    if (userId === project.createdBy.toString()) {
      return res.status(400).json({ message: 'Cannot remove project owner' });
    }
    project.members = project.members.filter((m) => m.user.toString() !== userId);
    if (!project.members.some((m) => m.user.toString() === req.user._id.toString())) {
      return res.status(400).json({ message: 'Invalid member removal' });
    }
    await project.save();
    const populated = await Project.findById(project._id)
      .populate('createdBy', 'name email avatarUrl')
      .populate('members.user', 'name email avatarUrl')
      .populate('workspaceId', 'name plugins');
    await logActivity({
      action: `User ${req.user.name} removed a member from project`,
      userId: req.user._id,
      projectId: project._id,
      metadata: { removedUserId: userId },
    });
    res.json({ project: populated });
  } catch (e) {
    next(e);
  }
}

export async function updateMemberRole(req, res, next) {
  try {
    const { userId } = req.params;
    const { role } = req.body;
    if (!['admin', 'member'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }
    const project = req.project;
    const m = project.members.find((x) => x.user.toString() === userId);
    if (!m) {
      return res.status(404).json({ message: 'Member not found' });
    }
    if (userId === project.createdBy.toString() && role !== 'admin') {
      return res.status(400).json({ message: 'Owner must stay admin' });
    }
    m.role = role;
    await project.save();
    const populated = await Project.findById(project._id)
      .populate('createdBy', 'name email avatarUrl')
      .populate('members.user', 'name email avatarUrl')
      .populate('workspaceId', 'name plugins');
    res.json({ project: populated });
  } catch (e) {
    next(e);
  }
}
