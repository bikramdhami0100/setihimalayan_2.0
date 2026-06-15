import User from '../models/User.js';
import Otp from '../models/Otp.js';
import { comparePassword } from '../utils/bcryptHelper.js';
import { generateTokens, verifyRefreshToken } from '../utils/jwtHelper.js';
import { successResponse, errorResponse } from '../utils/response.js';
import logger from '../utils/logger.js';
import { sendEmail } from '../services/emailService.js';
import { sendSms } from '../services/smsService.js';

export const register = async (req, res, next) => {
    try {
        const { email, phone, full_name, password, role = 'passenger' } = req.body;

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
            profile_image: user.profile_image,
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
        const { full_name, phone, date_of_birth, address, city, state, country, postal_code } = req.body;
        const updateData = { full_name, date_of_birth, address, city, state, country, postal_code };
        if (phone !== undefined) updateData.phone = phone;
        // Remove undefined fields
        Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

        await User.updateProfile(req.user.id, updateData);
        const user = await User.findById(req.user.id);
        successResponse(res, 'Profile updated successfully', { user });
    } catch (err) {
        next(err);
    }
};
export const resetPassword = async (req, res, next) => {
    try {
        const { email } = req.body;
        const user = await User.findByEmail(email);
        if (!user) return errorResponse(res, 'User not found', 404);
        const tokens = generateTokens({ id: user.id, email: user.email, role: user.role });
        await User.updateRefreshToken(user.id, tokens.refreshToken);
        const token = tokens.accessToken;
        const appLink = `setihimalayan://change-password?token=${token}`;
        const webLink = `${process.env.FRONTEND_URL}/change-password?token=${token}`;
        const message = `
            <p>Click below to reset your password:</p>
            <a href="${appLink}" style="display:inline-block;padding:12px 24px;background:#1e3a8a;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;">Reset Password</a>
            <br/><br/>
            <p style="color:#666;">If the button doesn't open your app, copy and paste this link in your browser:</p>
            <a href="${webLink}">${webLink}</a>
        `;
        sendEmail(email, 'Reset Password', message).catch(err => logger.error(err));
        successResponse(res, 'Token refreshed', { message: "Reset link has been sent to your email." });
    } catch (err) {
        next(err);
    }
}
export const changePassword = async (req, res, next) => {
    try {
        const { newPassword } = req.body;

        const user = await User.findById(req.user.id);
        if (!user) return errorResponse(res, 'User not found', 404);
        const { hashPassword } = await import('../utils/bcryptHelper.js');
        const newHash = await hashPassword(newPassword);
        await User.updateProfile(user.id, { password_hash: newHash });
        successResponse(res, 'Password changed successfully');
    } catch (err) {
        next(err);
    }
};

export const sendOtp = async (req, res, next) => {
    try {
        const { phone } = req.body;

        const user = await User.findByPhone(phone);
        if (!user) return errorResponse(res, 'No account found with this phone number', 404);
        if (user.status !== 'active') return errorResponse(res, 'Account is inactive. Please contact support.', 403);

        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

        await Otp.invalidateByPhone(phone);
        await Otp.create(phone, otpCode);

        const message = `Your OTP for Seti Himalayan login is: ${otpCode}. It expires in 5 minutes.`;

        sendSms(message, phone).catch(err => logger.error(`SMS failed for ${phone}: ${err.message}`));
        sendEmail(user.email, 'Your OTP for Login', `<h1>OTP Login</h1><p>${message}</p>`).catch(err => logger.error(err));

        successResponse(res, 'OTP sent successfully', { phone });
    } catch (err) {
        next(err);
    }
};

export const loginWithOtp = async (req, res, next) => {
    try {
        const { phone, otp } = req.body;

        const otpRecord = await Otp.verify(phone, otp);
        if (!otpRecord) return errorResponse(res, 'Invalid or expired OTP', 401);

        await Otp.markAsUsed(otpRecord.id);

        const user = await User.findByPhone(phone);
        if (!user) return errorResponse(res, 'User not found', 404);
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
            profile_image: user.profile_image,
            is_email_verified: user.is_email_verified
        };

        successResponse(res, 'Login successful', { user: userData, ...tokens });
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