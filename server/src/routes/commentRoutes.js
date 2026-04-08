import { Router } from 'express';
import * as comment from '../controllers/commentController.js';
import { requireAuth } from '../middleware/auth.js';
import { addCommentRules } from '../validators/index.js';

const r = Router();

r.post('/add', requireAuth, addCommentRules, comment.addComment);
r.get('/:taskId', requireAuth, comment.listComments);

export default r;
