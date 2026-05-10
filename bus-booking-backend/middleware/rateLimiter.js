import rateLimit from 'express-rate-limit';

/**
 * Strict rate limiter for authentication endpoints
 * Prevents brute force attacks
 */
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per window
    message: {
        success: false,
        message: 'Too many login attempts. Please try again after 15 minutes.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * General API rate limiter
 * Prevents abuse of public endpoints
 */
export const apiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10000, // 100 requests per minute
    message: {
        success: false,
        message: 'Too many requests. Please slow down.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Stricter limiter for booking operations (prevent seat spam)
 */
export const bookingLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 booking attempts per minute
    message: {
        success: false,
        message: 'Too many booking attempts. Please wait a moment.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Limiter for payment initiation (prevent payment abuse)
 */
export const paymentLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 5, // 5 payment initiations per minute
    message: {
        success: false,
        message: 'Too many payment attempts. Please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});