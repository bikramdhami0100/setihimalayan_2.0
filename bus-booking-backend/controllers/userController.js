import User from '../models/User.js';
import { successResponse, errorResponse } from '../utils/response.js';

export const getUsers = async (req, res, next) => {
    try {
        const filters = {};
        if (req.query.role) filters.role = req.query.role;
        if (req.query.status) filters.status = req.query.status;
        const users = await User.getAll(filters);
        successResponse(res, 'Users retrieved', { users });
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
        const { id } = req.params;
        await User.delete(id);
        successResponse(res, 'User deleted successfully');
    } catch (err) {
        next(err);
    }
};
