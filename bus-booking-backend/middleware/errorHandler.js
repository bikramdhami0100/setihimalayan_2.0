import logger from '../utils/logger.js';
import { errorResponse } from '../utils/response.js';

/**
 * Global error handling middleware
 * Catches all errors and sends appropriate JSON response
 */
const errorHandler = (err, req, res, next) => {
    // Log error with stack trace
    logger.error({
        message: err.message,
        stack: err.stack,
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
        userId: req.user?.id
    });

    // Handle specific error types
    if (err.code === 'ER_DUP_ENTRY') {
        return errorResponse(res, 'Duplicate entry error', 409);
    }
    if (err.code === 'ER_NO_REFERENCED_ROW_2') {
        return errorResponse(res, 'Foreign key constraint failed: referenced record does not exist', 400);
    }
    if (err.name === 'ValidationError') {
        return errorResponse(res, err.message, 400);
    }
    if (err.name === 'JsonWebTokenError') {
        return errorResponse(res, 'Invalid token', 401);
    }
    if (err.name === 'TokenExpiredError') {
        return errorResponse(res, 'Token expired', 401);
    }
    if (err.code === 'ECONNREFUSED') {
        return errorResponse(res, 'Database connection error', 503);
    }

    // Default server error
    const status = err.status || 500;
    const message = process.env.NODE_ENV === 'production' 
        ? 'Internal server error' 
        : err.message || 'Something went wrong';
    
    errorResponse(res, message, status);
};

export default errorHandler;