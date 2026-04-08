import { Router } from 'express';
import * as ws from '../controllers/workspaceController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireWorkspaceAdmin, requireWorkspaceMember } from '../middleware/workspaceAccess.js';
import {
  createWorkspaceRules,
  updateWorkspaceRules,
  addWorkspaceMemberRules,
} from '../validators/index.js';

const r = Router();

r.post('/create', requireAuth, createWorkspaceRules, ws.createWorkspace);
r.post('/add-member', requireAuth, requireWorkspaceAdmin(), addWorkspaceMemberRules, ws.addWorkspaceMember);
r.get('/', requireAuth, ws.listWorkspaces);
r.get('/:workspaceId', requireAuth, requireWorkspaceMember(), ws.getWorkspace);
r.put('/:workspaceId', requireAuth, requireWorkspaceAdmin(), updateWorkspaceRules, ws.updateWorkspace);
r.patch('/:workspaceId/plugins', requireAuth, requireWorkspaceAdmin(), ws.updateWorkspacePlugins);

export default r;
