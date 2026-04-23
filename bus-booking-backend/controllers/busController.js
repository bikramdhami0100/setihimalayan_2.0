import Bus from '../models/Bus.js';
import { successResponse, errorResponse } from '../utils/response.js';

export const createBus = async (req, res, next) => {
    try {
        const busData = req.body;
        const existing = await Bus.findByBusNumber(busData.bus_number);
        if (existing) return errorResponse(res, 'Bus number already exists', 400);
        
        const busId = await Bus.create(busData);
        successResponse(res, 'Bus created successfully', { busId }, 201);
    } catch (err) {
        next(err);
    }
};

export const getAllBuses = async (req, res, next) => {
    try {
        const { bus_type, status } = req.query;
        const filters = {};
        if (bus_type) filters.bus_type = bus_type;
        if (status) filters.status = status;
        const buses = await Bus.findAll(filters);
        successResponse(res, 'Buses retrieved', { buses });
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
        
        await Bus.update(busId, req.body);
        successResponse(res, 'Bus updated successfully');
    } catch (err) {
        next(err);
    }
};

export const updateBusStatus = async (req, res, next) => {
    try {
        const { status } = req.body;
        if (!['active', 'maintenance', 'retired'].includes(status)) {
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
        await Bus.delete(req.params.id);
        successResponse(res, 'Bus deleted successfully');
    } catch (err) {
        next(err);
    }
};