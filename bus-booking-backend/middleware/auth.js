import { verifyAccessToken } from '../utils/jwtHelper.js';
import { errorResponse } from '../utils/response.js';
import User from '../models/User.js';

/**
 * Middleware to authenticate JWT token
 * Attaches user object to req.user
 */
export const authenticate = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return errorResponse(res, 'No token provided. Please authenticate.', 401);
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = verifyAccessToken(token);
        const user = await User.findById(decoded.id);
        if (!user) {
            return errorResponse(res, 'User not found', 401);
        }
        if (user.status !== 'active') {
            return errorResponse(res, 'Account is inactive. Please contact support.', 403);
        }
        req.user = {
            id: user.id,
            email: user.email,
            role: user.role,
            full_name: user.full_name
        };
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return errorResponse(res, 'Token expired. Please refresh.', 401);
        }
        if (err.name === 'JsonWebTokenError') {
            return errorResponse(res, 'Invalid token.', 401);
        }
        return errorResponse(res, 'Authentication failed.', 401);
    }
};

/**
 * Optional authentication – does not fail if no token, but sets user if present
 */
export const optionalAuth = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
            const decoded = verifyAccessToken(token);
            const user = await User.findById(decoded.id);
            if (user && user.status === 'active') {
                req.user = {
                    id: user.id,
                    email: user.email,
                    role: user.role
                };
            }
        } catch (err) {
            // ignore, proceed without user
        }
    }
    next();
};