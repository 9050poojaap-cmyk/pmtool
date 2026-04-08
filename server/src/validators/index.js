import { body, param, query } from 'express-validator';

export const registerRules = [
  body('name').trim().notEmpty(),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
];

export const loginRules = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
];

export const updateProfileRules = [body('name').optional().trim().notEmpty()];

export const createProjectRules = [
  body('title').trim().notEmpty(),
  body('workspaceId').optional().isMongoId(),
];

export const updateProjectRules = [
  body('title').optional().trim().notEmpty(),
  body('description').optional().isString(),
];

export const addMemberRules = [
  body('projectId').isMongoId(),
  body('email').isEmail().normalizeEmail(),
  body('role').optional().isIn(['admin', 'member']),
];

export const createTaskRules = [
  body('title').trim().notEmpty(),
  body('projectId').isMongoId(),
  body('status').optional().isIn(['To Do', 'In Progress', 'Done']),
  body('priority').optional().isIn(['Low', 'Medium', 'High']),
  body('autoPriority').optional().isBoolean(),
];

export const createWorkspaceRules = [body('name').trim().notEmpty()];

export const updateWorkspaceRules = [
  body('name').optional().trim().notEmpty(),
  body('description').optional().isString(),
];

export const addWorkspaceMemberRules = [
  body('workspaceId').isMongoId(),
  body('email').isEmail().normalizeEmail(),
  body('role').optional().isIn(['admin', 'member']),
];

export const messageCreateRules = [
  body('channel').isIn(['project', 'dm']),
  body('text').trim().notEmpty(),
  body('projectId').optional().isMongoId(),
  body('recipientId').optional().isMongoId(),
];

export const updateTaskRules = [
  param('projectId').isMongoId(),
  param('taskId').isMongoId(),
  body('title').optional().trim().notEmpty(),
  body('status').optional().isIn(['To Do', 'In Progress', 'Done']),
  body('priority').optional().isIn(['Low', 'Medium', 'High']),
  body('autoPriority').optional().isBoolean(),
];

export const moveTaskRules = [
  body('taskId').isMongoId(),
  body('projectId').isMongoId(),
  body('status').isIn(['To Do', 'In Progress', 'Done']),
  body('position').optional().isNumeric(),
];

export const addCommentRules = [
  body('taskId').isMongoId(),
  body('text').trim().notEmpty(),
  body('parentComment').optional().isMongoId(),
];

export const paginationRules = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
];
