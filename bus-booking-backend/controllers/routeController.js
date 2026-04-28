import Route from '../models/Route.js';
import { successResponse, errorResponse } from '../utils/response.js';

export const createRoute = async (req, res, next) => {
    try {
        const routeData = req.body;
        const routeId = await Route.create(routeData);
        successResponse(res, 'Route created successfully', { routeId }, 201);
    } catch (err) {
        next(err);
    }
};

// export const getAllRoutes = async (req, res, next) => {
//     try {
//         const { active_only, limit, page, search } = req.query;
//         // come http://localhost:5000/api/routes?limit=5&page=2&search=Kathmandu

//         const routes = await Route.findAll(active_only === 'true', search, page ? parseInt(page) : undefined, limit ? parseInt(limit) : undefined);
//         successResponse(res, 'Routes retrieved', { routes });
//     } catch (err) {
//         next(err);
//     }
// };
export const getAllRoutes = async (req, res, next) => {
    try {
        const { active_only, limit, page, search } = req.query;

        const result = await Route.findAll({
            activeOnly: active_only === 'true',
            search: search || null,
            page: page ? parseInt(page, 10) : undefined,
            limit: limit ? parseInt(limit, 10) : undefined
        });

        successResponse(res, 'Routes retrieved', { 
            routes: result.routes,
            pagination: {
                page: page || 1,
                limit: limit || result.routes.length,
                total: result.total,
                totalPages: limit ? Math.ceil(result.total / limit):1
            }   
     });
    } catch (err) {
        next(err);
    }
};

export const getRouteById = async (req, res, next) => {
    try {
        const route = await Route.findById(req.params.id);
        if (!route) return errorResponse(res, 'Route not found', 404);
        successResponse(res, 'Route retrieved', { route });
    } catch (err) {
        next(err);
    }
};

export const searchRoutes = async (req, res, next) => {
    try {
        const { origin, destination } = req.query;
        if (!origin && !destination) {
            return errorResponse(res, 'Provide origin or destination to search', 400);
        }
        const routes = await Route.search(origin, destination);
        successResponse(res, 'Routes found', { routes });
    } catch (err) {
        next(err);
    }
};

export const updateRoute = async (req, res, next) => {
    try {
        const route = await Route.findById(req.params.id);
        if (!route) return errorResponse(res, 'Route not found', 404);
        await Route.update(req.params.id, req.body);
        successResponse(res, 'Route updated successfully');
    } catch (err) {
        next(err);
    }
};

export const toggleRouteActive = async (req, res, next) => {
    try {
        const { is_active } = req.body;
        if (typeof is_active !== 'boolean') return errorResponse(res, 'is_active must be boolean', 400);
        await Route.toggleActive(req.params.id, is_active);
        successResponse(res, `Route ${is_active ? 'activated' : 'deactivated'}`);
    } catch (err) {
        next(err);
    }
};

export const deleteRoute = async (req, res, next) => {
    try {
        const route = await Route.findById(req.params.id);
        if (!route) return errorResponse(res, 'Route not found', 404);
        await Route.delete(req.params.id);
        successResponse(res, 'Route deleted');
    } catch (err) {
        next(err);
    }
};