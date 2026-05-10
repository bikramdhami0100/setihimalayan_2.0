import User from '../models/User.js';
import { successResponse, errorResponse } from '../utils/response.js';

export const getSettings = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return errorResponse(res, 'User not found', 404);

        successResponse(res, 'Settings retrieved', {
            language: user.language || 'en',
            notification_preferences: user.notification_preferences || {
                push_notifications: true,
                email_notifications: true,
                sms_notifications: false,
                booking_updates: true,
                promotional_offers: false,
            }
        });
    } catch (err) {
        next(err);
    }
};

export const updateSettings = async (req, res, next) => {
    try {
        const { language, notification_preferences } = req.body;
        const updateData = {};

        if (language !== undefined) updateData.language = language;
        if (notification_preferences !== undefined) {
            updateData.notification_preferences = JSON.stringify(notification_preferences);
        }

        if (Object.keys(updateData).length === 0) {
            return errorResponse(res, 'No settings to update', 400);
        }

        await User.updateProfile(req.user.id, updateData);
        const user = await User.findById(req.user.id);

        successResponse(res, 'Settings updated successfully', {
            language: user.language || 'en',
            notification_preferences: user.notification_preferences || {
                push_notifications: true,
                email_notifications: true,
                sms_notifications: false,
                booking_updates: true,
                promotional_offers: false,
            }
        });
    } catch (err) {
        next(err);
    }
};
