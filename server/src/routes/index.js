import { Router } from 'express';
import authRoutes from './authRoutes.js';
import projectRoutes from './projectRoutes.js';
import taskRoutes from './taskRoutes.js';
import commentRoutes from './commentRoutes.js';
import workspaceRoutes from './workspaceRoutes.js';
import messageRoutes from './messageRoutes.js';
import miscRoutes from './miscRoutes.js';

const router = Router();

router.get('/health', (req, res) => res.json({ ok: true }));

router.use('/auth', authRoutes);
router.use('/workspaces', workspaceRoutes);
router.use('/messages', messageRoutes);
router.use('/projects', projectRoutes);
router.use('/tasks', taskRoutes);
router.use('/comments', commentRoutes);
router.use('/', miscRoutes);

export default router;
