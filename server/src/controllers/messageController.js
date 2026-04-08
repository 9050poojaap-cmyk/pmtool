import { validationResult } from 'express-validator';
import { Message } from '../models/Message.js';
import { Project } from '../models/Project.js';
import { User } from '../models/User.js';
import { emitChatProject, emitDmRoom, emitToUser } from '../socket/index.js';

export function buildDmKey(userIdA, userIdB) {
  return [String(userIdA), String(userIdB)].sort().join('::');
}

async function populateMessage(m) {
  return Message.findById(m._id)
    .populate('sender', 'name email avatarUrl')
    .populate('projectId', 'title')
    .lean();
}

export async function listProjectMessages(req, res, next) {
  try {
    const { projectId } = req.params;
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 40));
    const items = await Message.find({ channel: 'project', projectId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('sender', 'name email avatarUrl')
      .lean();
    res.json({ messages: items.reverse() });
  } catch (e) {
    next(e);
  }
}

export async function listDmMessages(req, res, next) {
  try {
    const { otherUserId } = req.params;
    const me = req.user._id.toString();
    if (otherUserId === me) {
      return res.status(400).json({ message: 'Invalid DM' });
    }
    const other = await User.findById(otherUserId);
    if (!other) {
      return res.status(404).json({ message: 'User not found' });
    }
    const dmKey = buildDmKey(me, otherUserId);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 40));
    const items = await Message.find({ channel: 'dm', dmKey })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('sender', 'name email avatarUrl')
      .lean();
    res.json({ messages: items.reverse(), dmKey });
  } catch (e) {
    next(e);
  }
}

export async function createMessageHttp(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { channel, text, projectId, recipientId } = req.body;
    const msg = await createAndBroadcastMessage({
      channel,
      text,
      projectId,
      recipientId,
      senderId: req.user._id,
    });
    if (!msg.ok) {
      return res.status(msg.status).json({ message: msg.message });
    }
    const populated = await populateMessage(msg.doc);
    res.status(201).json({ message: populated });
  } catch (e) {
    next(e);
  }
}

/** Shared by HTTP + Socket.IO */
export async function createAndBroadcastMessage({ channel, text, projectId, recipientId, senderId }) {
  if (channel === 'project') {
    if (!projectId) {
      return { ok: false, status: 400, message: 'projectId required' };
    }
    const project = await Project.findById(projectId);
    if (!project) {
      return { ok: false, status: 404, message: 'Project not found' };
    }
    const isMember = project.members.some((m) => m.user.toString() === senderId.toString());
    if (!isMember) {
      return { ok: false, status: 403, message: 'Not a project member' };
    }
    const doc = await Message.create({
      channel: 'project',
      projectId,
      workspaceId: project.workspaceId || null,
      sender: senderId,
      text,
      dmKey: null,
    });
    const populated = await populateMessage(doc);
    emitChatProject(String(projectId), 'message:receive', { message: populated });
    return { ok: true, doc };
  }
  if (channel === 'dm') {
    if (!recipientId) {
      return { ok: false, status: 400, message: 'recipientId required' };
    }
    if (String(recipientId) === String(senderId)) {
      return { ok: false, status: 400, message: 'Invalid DM' };
    }
    const other = await User.findById(recipientId);
    if (!other) {
      return { ok: false, status: 404, message: 'Recipient not found' };
    }
    const dmKey = buildDmKey(senderId, recipientId);
    const doc = await Message.create({
      channel: 'dm',
      projectId: null,
      workspaceId: null,
      sender: senderId,
      text,
      dmKey,
    });
    const populated = await populateMessage(doc);
    emitDmRoom(dmKey, 'message:receive', { message: populated });
    emitToUser(String(recipientId), 'message:receive', { message: populated });
    return { ok: true, doc };
  }
  return { ok: false, status: 400, message: 'Invalid channel' };
}
