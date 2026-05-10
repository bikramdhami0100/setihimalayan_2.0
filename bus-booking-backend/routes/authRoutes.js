import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
    register,
    login,
    refreshToken,
    getProfile,
    updateProfile,
    changePassword,
    resetPassword,
    logout
} from '../controllers/authController.js';
import {
    getSettings,
    updateSettings
} from '../controllers/settingsController.js';
import {
    validate,
    registerSchema,
    loginSchema,
    changePasswordSchema
} from '../middleware/validation.js';
import { authenticate } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { uploadProfileImage, handleUploadError } from '../middleware/upload.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Public routes
router.post('/register', validate(registerSchema), register);
router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/refresh-token', refreshToken);
router.get('/', (req, res) => res.json({ success: true, message: 'Auth API is working' }));
// Protected routes
router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, updateProfile);
// reset password routes
router.post('/reset-password', resetPassword);
router.post('/change-password', authenticate, validate(changePasswordSchema), changePassword);
router.post('/logout', authenticate, logout);
router.get('/settings', authenticate, getSettings);
router.put('/settings', authenticate, updateSettings);
router.post('/upload-profile-image', authenticate, uploadProfileImage, handleUploadError, async (req, res) => {
    if (req.file) {
        const profileImageUrl = `${req.protocol}://${req.get('host')}/uploads/profiles/${req.file.filename}`;
        // Delete old profile image if exists
        try {
            const User = (await import('../models/User.js')).default;
            const currentUser = await User.findById(req.user.id);
            if (currentUser?.profile_image) {
                const oldFilename = path.basename(currentUser.profile_image);
                const oldPath = path.join(__dirname, '../uploads/profiles', oldFilename);
                if (fs.existsSync(oldPath)) {
                    fs.unlinkSync(oldPath);
                }
            }
            await User.updateProfile(req.user.id, { profile_image: profileImageUrl });
        } catch (err) {
            // If deletion fails, still try to update DB
            const User = (await import('../models/User.js')).default;
            await User.updateProfile(req.user.id, { profile_image: profileImageUrl });
        }
        res.json({ success: true, message: 'Profile image uploaded', data: { profile_image: profileImageUrl } });
    } else {
        res.status(400).json({ success: false, message: 'No file uploaded' });
    }
});

export default router;