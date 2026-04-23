import { errorResponse } from '../utils/response.js';

/**
 * Middleware factory to restrict access to specific roles
 * @param {...string} allowedRoles - List of roles allowed to access the route
 * @returns {Function} Express middleware
 */
export const roleCheck = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return errorResponse(res, 'Authentication required', 401);
        }
        if (allowedRoles.includes(req.user.role)) {
            next();
        } else {
            errorResponse(res, 'Access denied: insufficient permissions', 403);
        }
    };
};

/**
 * Specific role checks for convenience
 */
export const isAdmin = (req, res, next) => {
    if (!req.user) return errorResponse(res, 'Authentication required', 401);
    if (req.user.role === 'admin' || req.user.role === 'super_admin') {
        next();
    } else {
        errorResponse(res, 'Admin access required', 403);
    }
};

export const isSuperAdmin = (req, res, next) => {
    if (!req.user) return errorResponse(res, 'Authentication required', 401);
    if (req.user.role === 'super_admin') {
        next();
    } else {
        errorResponse(res, 'Super admin access required', 403);
    }
};

export const isOwnerOrAdmin = (resourceUserId) => {
    return (req, res, next) => {
        if (!req.user) return errorResponse(res, 'Authentication required', 401);
        if (req.user.role === 'admin' || req.user.role === 'super_admin' || req.user.id === resourceUserId) {
            next();
        } else {
            errorResponse(res, 'You are not authorized to access this resource', 403);
        }
    };
};