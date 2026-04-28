import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { isAdmin, isSuperAdmin } from '../middleware/roleCheck.js';
import { validate, roleUpdateSchema } from '../middleware/validation.js';
import { getUsers, updateUserRole, deleteUser } from '../controllers/userController.js';

const router = express.Router();

router.get('/', authenticate, isAdmin, getUsers);
router.put('/:id/role', authenticate, isSuperAdmin, validate(roleUpdateSchema), updateUserRole);
router.delete('/:id', authenticate, isAdmin, deleteUser);

export default router;
