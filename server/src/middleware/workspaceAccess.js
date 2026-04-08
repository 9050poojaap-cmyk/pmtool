import { Workspace } from '../models/Workspace.js';

async function loadWorkspace(wsId, userId) {
  const workspace = await Workspace.findById(wsId);
  if (!workspace) return { error: 'Workspace not found', workspace: null, membership: null };
  const membership = workspace.members.find((m) => m.user.toString() === userId.toString());
  if (!membership) {
    return { error: 'Not a workspace member', workspace, membership: null };
  }
  return { error: null, workspace, membership };
}

export function requireWorkspaceMember() {
  return async (req, res, next) => {
    const workspaceId = req.params.workspaceId || req.body.workspaceId || req.query.workspaceId;
    if (!workspaceId) {
      return res.status(400).json({ message: 'workspaceId is required' });
    }
    const { error, workspace, membership } = await loadWorkspace(workspaceId, req.user._id);
    if (error) {
      const status = error === 'Workspace not found' ? 404 : 403;
      return res.status(status).json({ message: error });
    }
    req.ws = workspace;
    req.wsRole = membership.role;
    next();
  };
}

export function requireWorkspaceAdmin() {
  return async (req, res, next) => {
    const workspaceId = req.params.workspaceId || req.body.workspaceId || req.query.workspaceId;
    if (!workspaceId) {
      return res.status(400).json({ message: 'workspaceId is required' });
    }
    const { error, workspace, membership } = await loadWorkspace(workspaceId, req.user._id);
    if (error) {
      const status = error === 'Workspace not found' ? 404 : 403;
      return res.status(status).json({ message: error });
    }
    if (!['owner', 'admin'].includes(membership.role)) {
      return res.status(403).json({ message: 'Workspace admin only' });
    }
    req.ws = workspace;
    req.wsRole = membership.role;
    next();
  };
}
