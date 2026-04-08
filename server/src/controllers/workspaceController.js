import { validationResult } from 'express-validator';
import { Workspace } from '../models/Workspace.js';
import { User } from '../models/User.js';

const defaultPlugins = () => ({
  chat: true,
  reports: true,
  analytics: true,
});

export async function createWorkspace(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { name, description } = req.body;
    const ws = await Workspace.create({
      name,
      description: description || '',
      createdBy: req.user._id,
      members: [{ user: req.user._id, role: 'owner' }],
      plugins: defaultPlugins(),
    });
    const populated = await Workspace.findById(ws._id)
      .populate('createdBy', 'name email avatarUrl')
      .populate('members.user', 'name email avatarUrl');
    res.status(201).json({ workspace: populated });
  } catch (e) {
    next(e);
  }
}

export async function listWorkspaces(req, res, next) {
  try {
    const list = await Workspace.find({ 'members.user': req.user._id })
      .populate('createdBy', 'name email avatarUrl')
      .populate('members.user', 'name email avatarUrl')
      .sort({ updatedAt: -1 });
    res.json({ workspaces: list });
  } catch (e) {
    next(e);
  }
}

export async function getWorkspace(req, res, next) {
  try {
    const ws = await Workspace.findById(req.params.workspaceId)
      .populate('createdBy', 'name email avatarUrl')
      .populate('members.user', 'name email avatarUrl');
    if (!ws) {
      return res.status(404).json({ message: 'Workspace not found' });
    }
    const ok = ws.members.some((m) => m.user._id.toString() === req.user._id.toString());
    if (!ok) {
      return res.status(403).json({ message: 'Not a workspace member' });
    }
    res.json({ workspace: ws });
  } catch (e) {
    next(e);
  }
}

export async function updateWorkspace(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const ws = req.ws;
    const { name, description } = req.body;
    if (name !== undefined) ws.name = name;
    if (description !== undefined) ws.description = description;
    await ws.save();
    const populated = await Workspace.findById(ws._id)
      .populate('createdBy', 'name email avatarUrl')
      .populate('members.user', 'name email avatarUrl');
    res.json({ workspace: populated });
  } catch (e) {
    next(e);
  }
}

export async function addWorkspaceMember(req, res, next) {
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
    const ws = req.ws;
    const exists = ws.members.some((m) => m.user.toString() === userToAdd._id.toString());
    if (exists) {
      return res.status(409).json({ message: 'User already in workspace' });
    }
    const r = ['owner', 'admin', 'member'].includes(role) ? role : 'member';
    if (r === 'owner') {
      return res.status(400).json({ message: 'Cannot add as owner' });
    }
    ws.members.push({ user: userToAdd._id, role: r });
    await ws.save();
    const populated = await Workspace.findById(ws._id)
      .populate('createdBy', 'name email avatarUrl')
      .populate('members.user', 'name email avatarUrl');
    res.json({ workspace: populated });
  } catch (e) {
    next(e);
  }
}

export async function updateWorkspacePlugins(req, res, next) {
  try {
    const ws = req.ws;
    const { plugins } = req.body;
    if (plugins && typeof plugins === 'object') {
      ws.plugins = { ...defaultPlugins(), ...(ws.plugins?.toObject?.() || ws.plugins), ...plugins };
    }
    await ws.save();
    const populated = await Workspace.findById(ws._id)
      .populate('createdBy', 'name email avatarUrl')
      .populate('members.user', 'name email avatarUrl');
    res.json({ workspace: populated });
  } catch (e) {
    next(e);
  }
}
