import Bus from '../models/Bus.js';
import { successResponse, errorResponse } from '../utils/response.js';

export const createBus = async (req, res, next) => {
    try {
        const busData = req.body;
        const existing = await Bus.findByBusNumber(busData.bus_number);
        if (existing) return errorResponse(res, 'Bus number already exists', 400);
        
        if (busData.registration_number) {
            const existingReg = await Bus.findByRegistrationNumber(busData.registration_number);
            if (existingReg) return errorResponse(res, 'Registration number already exists', 400);
        } else {
            busData.registration_number = null;
        }

        const busId = await Bus.create(busData);
        successResponse(res, 'Bus created successfully', { busId }, 201);
    } catch (err) {
        next(err);
    }
};

export const getAllBuses = async (req, res, next) => {
    try {
        const { bus_type, status, search, page, limit, sortBy, sortOrder } = req.query;
        const filters = {
            bus_type,
            status,
            search,
            sortBy,
            sortOrder,
            page: page ? parseInt(page) : undefined,
            limit: limit ? parseInt(limit) : undefined
        };
        const { buses, total } = await Bus.findAll(filters);
        successResponse(res, 'Buses retrieved', { 
            buses,
            pagination: {
                total,
                page: filters.page || 1,
                limit: filters.limit || total,
                totalPages: filters.limit ? Math.ceil(total / filters.limit) : 1
            }
        });
    } catch (err) {
        next(err);
    }
};

export const getBusById = async (req, res, next) => {
    try {
        const bus = await Bus.findById(req.params.id);
        if (!bus) return errorResponse(res, 'Bus not found', 404);
        successResponse(res, 'Bus retrieved', { bus });
    } catch (err) {
        next(err);
    }
};

export const updateBus = async (req, res, next) => {
    try {
        const busId = req.params.id;
        const bus = await Bus.findById(busId);
        if (!bus) return errorResponse(res, 'Bus not found', 404);
        
        const updateData = req.body;
        if (updateData.registration_number === '') {
            updateData.registration_number = null;
        }

        if (updateData.registration_number) {
            const existingReg = await Bus.findByRegistrationNumber(updateData.registration_number);
            if (existingReg && existingReg.id !== Number(busId)) {
                return errorResponse(res, 'Registration number already exists', 400);
            }
        }
        
        await Bus.update(busId, updateData);
        successResponse(res, 'Bus updated successfully');
    } catch (err) {
        next(err);
    }
};

export const updateBusStatus = async (req, res, next) => {
    try {
        const { status } = req.body;
        if (!['active', 'maintenance', 'retired', 'inactive'].includes(status)) {
            return errorResponse(res, 'Invalid status', 400);
        }
        await Bus.updateStatus(req.params.id, status);
        successResponse(res, 'Bus status updated');
    } catch (err) {
        next(err);
    }
};

export const deleteBus = async (req, res, next) => {
    try {
        const bus = await Bus.findById(req.params.id);
        if (!bus) return errorResponse(res, 'Bus not found', 404);
        const affected = await Bus.delete(req.params.id);
        if (!affected) return errorResponse(res, 'Could not delete bus. No rows affected.', 500);
        successResponse(res, 'Bus deleted successfully');
    } catch (err) {
        next(err);
    }
};