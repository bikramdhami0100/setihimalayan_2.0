import User from '../models/User.js';
import { successResponse, errorResponse } from '../utils/response.js';

export const getUsers = async (req, res, next) => {
    try {
        const { role, status, page, limit, search } = req.query;

        const filters = {
            role: role || null,
            status: status || null,
            search: search || null,
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
