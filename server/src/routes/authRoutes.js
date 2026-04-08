import { Router } from 'express';
import * as auth from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';
import { uploadSingle } from '../middleware/upload.js';
import { registerRules, loginRules, updateProfileRules } from '../validators/index.js';

const r = Router();

r.post('/register', registerRules, auth.register);
r.post('/login', loginRules, auth.login);
r.get('/me', requireAuth, auth.me);
r.patch('/profile', requireAuth, updateProfileRules, auth.updateProfile);
r.post('/avatar', requireAuth, uploadSingle, auth.uploadAvatar);

export default r;
