import express from 'express';
import { 
    register, 
    login, 
    refreshToken, 
    getProfile, 
    updateProfile, 
    changePassword, 
    logout 
} from '../controllers/authController.js';
import { 
    validate, 
    registerSchema, 
    loginSchema, 
    changePasswordSchema 
} from '../middleware/validation.js';
import { authenticate } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { uploadProfileImage, handleUploadError } from '../middleware/upload.js';

const router = express.Router();

// Public routes
router.post('/register', validate(registerSchema), register);
router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/refresh-token', refreshToken);
router.get('/',(req, res) => res.json({ success: true, message: 'Auth API is working' }));  
// Protected routes
router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, updateProfile);
router.post('/change-password', authenticate, validate(changePasswordSchema), changePassword);
router.post('/logout', authenticate, logout);
router.post('/upload-profile-image', authenticate, uploadProfileImage, handleUploadError, async (req, res) => {
    if (req.file) {
        const profileImageUrl = `/uploads/profiles/${req.file.filename}`;
        await (await import('../models/User.js')).default.updateProfile(req.user.id, { profile_image: profileImageUrl });
        res.json({ success: true, message: 'Profile image uploaded', data: { profile_image: profileImageUrl } });
    } else {
        res.status(400).json({ success: false, message: 'No file uploaded' });
    }
});

export default router;