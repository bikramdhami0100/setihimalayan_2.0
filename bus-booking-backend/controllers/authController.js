import User from '../models/User.js';
import { comparePassword } from '../utils/bcryptHelper.js';
import { generateTokens, verifyRefreshToken } from '../utils/jwtHelper.js';
import { successResponse, errorResponse } from '../utils/response.js';
import logger from '../utils/logger.js';
import { sendEmail } from '../services/emailService.js';

export const register = async (req, res, next) => {
    try {
        const { email, phone, full_name, password, role } = req.body;
        
        const existingEmail = await User.findByEmail(email);
        if (existingEmail) return errorResponse(res, 'Email already exists', 400);
        
        const existingPhone = await User.findByPhone(phone);
        if (existingPhone) return errorResponse(res, 'Phone number already exists', 400);
        
        const userId = await User.create({ email, phone, full_name, password, role });
        
        // Send welcome email (async, don't wait)
        sendEmail(email, 'Welcome to Bus Booking System', `<h1>Welcome ${full_name}!</h1><p>Your account has been created successfully.</p>`).catch(err => logger.error(err));
        
        successResponse(res, 'User registered successfully', { userId }, 201);
    } catch (err) {
        next(err);
    }
};

export const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const user = await User.findByEmail(email);
        if (!user) return errorResponse(res, 'Invalid credentials', 401);
        
        const isMatch = await comparePassword(password, user.password_hash);
        if (!isMatch) return errorResponse(res, 'Invalid credentials', 401);
        
        if (user.status !== 'active') return errorResponse(res, 'Account is inactive. Please contact support.', 403);
        
        const tokens = generateTokens({ id: user.id, email: user.email, role: user.role });
        await User.updateRefreshToken(user.id, tokens.refreshToken);
        await User.updateLastLogin(user.id);
        
        const userData = {
            id: user.id,
            email: user.email,
            full_name: user.full_name,
            phone: user.phone,
            role: user.role,
            is_email_verified: user.is_email_verified
        };
        
        successResponse(res, 'Login successful', { user: userData, ...tokens });
    } catch (err) {
        next(err);
    }
};

export const refreshToken = async (req, res, next) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) return errorResponse(res, 'Refresh token required', 401);
        
        const decoded = verifyRefreshToken(refreshToken);
        const user = await User.findById(decoded.id);
        if (!user || user.refresh_token_hash !== refreshToken) {
            return errorResponse(res, 'Invalid refresh token', 401);
        }
        
        const tokens = generateTokens({ id: user.id, email: user.email, role: user.role });
        await User.updateRefreshToken(user.id, tokens.refreshToken);
        
        successResponse(res, 'Token refreshed', tokens);
    } catch (err) {
        errorResponse(res, 'Invalid or expired refresh token', 401);
    }
};

export const getProfile = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return errorResponse(res, 'User not found', 404);
        successResponse(res, 'Profile retrieved', { user });
    } catch (err) {
        next(err);
    }
};

export const updateProfile = async (req, res, next) => {
    try {
        const { full_name, date_of_birth, address, city, state, country, postal_code } = req.body;
        const updateData = { full_name, date_of_birth, address, city, state, country, postal_code };
        // Remove undefined fields
        Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);
        
        await User.updateProfile(req.user.id, updateData);
        successResponse(res, 'Profile updated successfully');
    } catch (err) {
        next(err);
    }
};

export const changePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = await User.findByEmail(req.user.email);
        const isMatch = await comparePassword(currentPassword, user.password_hash);
        if (!isMatch) return errorResponse(res, 'Current password is incorrect', 400);
        
        const { hashPassword } = await import('../utils/bcryptHelper.js');
        const newHash = await hashPassword(newPassword);
        await User.updateProfile(req.user.id, { password_hash: newHash });
        successResponse(res, 'Password changed successfully');
    } catch (err) {
        next(err);
    }
};

export const logout = async (req, res, next) => {
    try {
        await User.updateRefreshToken(req.user.id, null);
        successResponse(res, 'Logged out successfully');
    } catch (err) {
        next(err);
    }
};