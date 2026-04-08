import { Router } from 'express';
import * as messages from '../controllers/messageController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireProjectMember } from '../middleware/projectAccess.js';
import { requirePlugin } from '../middleware/plugins.js';
import { messageCreateRules } from '../validators/index.js';

const r = Router();

r.get(
  '/project/:projectId',
  requireAuth,
  requireProjectMember(),
  requirePlugin('chat'),
  messages.listProjectMessages
);
r.get('/dm/:otherUserId', requireAuth, messages.listDmMessages);
r.post('/', requireAuth, messageCreateRules, messages.createMessageHttp);

export default r;
