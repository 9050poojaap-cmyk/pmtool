import { Router } from 'express';
import * as task from '../controllers/taskController.js';
import { requireAuth } from '../middleware/auth.js';
import {
  requireProjectMember,
  requireProjectAdmin,
} from '../middleware/projectAccess.js';
import {
  createTaskRules,
  updateTaskRules,
  moveTaskRules,
  paginationRules,
} from '../validators/index.js';

const r = Router();

r.post(
  '/create',
  requireAuth,
  requireProjectMember(),
  createTaskRules,
  task.createTask
);
r.put('/move', requireAuth, requireProjectMember(), moveTaskRules, task.moveTask);
r.put(
  '/reorder/:projectId',
  requireAuth,
  requireProjectMember(),
  task.reorderColumn
);
r.put(
  '/update/:projectId/:taskId',
  requireAuth,
  requireProjectMember(),
  updateTaskRules,
  task.updateTask
);
r.delete(
  '/delete/:projectId/:taskId',
  requireAuth,
  requireProjectMember(),
  requireProjectAdmin(),
  task.deleteTask
);
r.post(
  '/rollback/:projectId/:taskId',
  requireAuth,
  requireProjectMember(),
  task.rollbackTask
);
r.get(
  '/:projectId/versions/:taskId',
  requireAuth,
  requireProjectMember(),
  task.listVersions
);
r.get(
  '/:projectId/:taskId',
  requireAuth,
  requireProjectMember(),
  task.getTask
);
r.get(
  '/:projectId',
  requireAuth,
  requireProjectMember(),
  paginationRules,
  task.listTasks
);

export default r;
