import User from '../models/User.js';
import { successResponse, errorResponse } from '../utils/response.js';

export const createUser = async (req, res, next) => {
    try {
        const userData = { ...req.body };
        if (req.file) {
            userData.profile_image = `/uploads/profiles/${req.file.filename}`;
        }
        const existingEmail = await User.findByEmail(userData.email);
        if (existingEmail) return errorResponse(res, 'Email already exists', 400);
        if (userData.phone) {
            const existingPhone = await User.findByPhone(userData.phone);
            if (existingPhone) return errorResponse(res, 'Phone number already exists', 400);
        }
        const userId = await User.create(userData);
        const user = await User.findById(userId);
        successResponse(res, 'User created successfully', { user }, 201);
    } catch (err) {
        next(err);
    }
};

export const getUsers = async (req, res, next) => {
    try {
        const { role, status, search, page, limit, sortBy, sortOrder } = req.query;

        const filters = {
            role: role || null,
            status: status || null,
            search: search || null,
            sortBy: sortBy || null,
            sortOrder: sortOrder || null,
            page: page ? parseInt(page, 10) : 1,
            limit: limit ? parseInt(limit, 10) : 10
        };

        const { rows: users, total, page: currentPage, limit: pageLimit } =
            await User.getAll(filters);

        successResponse(res, 'Users retrieved', {
            users,
            pagination: {
                page: currentPage,
                limit: pageLimit,
                total,
                totalPages: Math.ceil(total / pageLimit)
            }
        });
    } catch (err) {
        next(err);
    }
};

export const getUserById = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return errorResponse(res, 'User not found', 404);
        successResponse(res, 'User retrieved', { user });
    } catch (err) {
        next(err);
    }
};

export const updateUser = async (req, res, next) => {
    try {
        const userId = req.params.id;
        const user = await User.findById(userId);
        if (!user) return errorResponse(res, 'User not found', 404);

        const updateData = { ...req.body };
        if (req.file) {
            updateData.profile_image = `/uploads/profiles/${req.file.filename}`;
        }
        if (updateData.email) {
            const existingEmail = await User.findByEmail(updateData.email);
            if (existingEmail && existingEmail.id !== Number(userId)) {
                return errorResponse(res, 'Email already in use', 400);
            }
        }
        if (updateData.phone) {
            const existingPhone = await User.findByPhone(updateData.phone);
            if (existingPhone && existingPhone.id !== Number(userId)) {
                return errorResponse(res, 'Phone number already in use', 400);
            }
        }

        await User.update(userId, updateData);
        const updated = await User.findById(userId);
        successResponse(res, 'User updated successfully', { user: updated });
    } catch (err) {
        next(err);
    }
};

export const updateUserStatus = async (req, res, next) => {
    try {
        const { status } = req.body;
        if (!['active', 'inactive', 'suspended'].includes(status)) {
            return errorResponse(res, 'Invalid status', 400);
        }
        await User.updateStatus(req.params.id, status);
        successResponse(res, 'User status updated');
    } catch (err) {
        next(err);
    }
};

export const updateUserRole = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { role } = req.body;
        if (!role) return errorResponse(res, 'Role is required', 400);
        await User.updateRole(id, role);
        successResponse(res, 'User role updated successfully');
    } catch (err) {
        next(err);
    }
};

export const deleteUser = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return errorResponse(res, 'User not found', 404);
        await User.delete(req.params.id);
        successResponse(res, 'User deleted successfully');
    } catch (err) {
        next(err);
    }
};
