import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { errorResponse } from '../utils/response.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, '../uploads');

// Ensure upload directories exist
const profileDir = path.join(uploadDir, 'profiles');
const ticketDir = path.join(uploadDir, 'tickets');
if (!fs.existsSync(profileDir)) fs.mkdirSync(profileDir, { recursive: true });
if (!fs.existsSync(ticketDir)) fs.mkdirSync(ticketDir, { recursive: true });

// Profile image upload configuration
const profileStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, profileDir),
    filename: (req, file, cb) => {
        const unique = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
        cb(null, `profile-${req.user?.id || unique}${path.extname(file.originalname)}`);
    }
});

const fileFilter = (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext && mime) cb(null, true);
    else cb(new Error('Only image files are allowed'), false);
};

export const uploadProfileImage = multer({
    storage: profileStorage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
    fileFilter
}).single('profile_image');

// Generic upload error handler middleware
export const handleUploadError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return errorResponse(res, 'File too large. Max size 2MB.', 400);
        }
        return errorResponse(res, err.message, 400);
    }
    if (err) return errorResponse(res, err.message, 400);
    next();
};