import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { isAdmin, isSuperAdmin } from '../middleware/roleCheck.js';
import { validate, roleUpdateSchema, createUserSchema, updateUserSchema } from '../middleware/validation.js';
import {
    getUsers, getUserById, createUser, updateUser,
    updateUserRole, updateUserStatus, deleteUser
} from '../controllers/userController.js';
import { uploadProfileImage } from '../middleware/upload.js';

const router = express.Router();

router.get('/', authenticate, isAdmin, getUsers);
router.get('/:id', authenticate, isAdmin, getUserById);
router.post('/', authenticate, isAdmin, uploadProfileImage, validate(createUserSchema), createUser);
router.put('/:id', authenticate, isAdmin, uploadProfileImage, validate(updateUserSchema), updateUser);
router.put('/:id/role', authenticate, isSuperAdmin, validate(roleUpdateSchema), updateUserRole);
router.patch('/:id/status', authenticate, isAdmin, updateUserStatus);
router.delete('/:id', authenticate, isAdmin, deleteUser);

export default router;
