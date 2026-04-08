import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as analytics from '../controllers/analyticsController.js';
import * as activity from '../controllers/activityController.js';
import * as upload from '../controllers/uploadController.js';
import * as users from '../controllers/userController.js';
import * as search from '../controllers/searchController.js';
import * as reports from '../controllers/reportController.js';
import { requireProjectMember } from '../middleware/projectAccess.js';
import { requirePlugin } from '../middleware/plugins.js';
import { uploadSingle } from '../middleware/upload.js';

const r = Router();

r.get('/analytics/:projectId', requireAuth, requireProjectMember(), analytics.projectAnalytics);
r.get(
  '/analytics/:projectId/burndown',
  requireAuth,
  requireProjectMember(),
  requirePlugin('analytics'),
  analytics.projectBurndown
);
r.get('/activity/:projectId', requireAuth, requireProjectMember(), activity.listProjectActivity);
r.post('/upload', requireAuth, uploadSingle, upload.uploadFile);
r.get('/users/search', requireAuth, users.searchUsers);
r.get('/search', requireAuth, search.smartSearch);
r.get(
  '/reports/pdf/:projectId',
  requireAuth,
  requireProjectMember(),
  requirePlugin('reports'),
  reports.projectPdfReport
);

export default r;
