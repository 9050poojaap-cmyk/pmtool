import { Router } from 'express';
import * as project from '../controllers/projectController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireProjectAdmin } from '../middleware/projectAccess.js';
import {
  createProjectRules,
  updateProjectRules,
  addMemberRules,
} from '../validators/index.js';

const r = Router();

r.post('/create', requireAuth, createProjectRules, project.createProject);
r.post(
  '/add-member',
  requireAuth,
  requireProjectAdmin(),
  addMemberRules,
  project.addMember
);
r.get('/', requireAuth, project.listProjects);
r.get('/:projectId', requireAuth, project.getProject);
r.put(
  '/:projectId',
  requireAuth,
  requireProjectAdmin(),
  updateProjectRules,
  project.updateProject
);
r.delete(
  '/:projectId/members/:userId',
  requireAuth,
  requireProjectAdmin(),
  project.removeMember
);
r.patch(
  '/:projectId/members/:userId/role',
  requireAuth,
  requireProjectAdmin(),
  project.updateMemberRole
);

export default r;
