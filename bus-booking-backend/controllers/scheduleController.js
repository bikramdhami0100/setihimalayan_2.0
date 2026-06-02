import Schedule from '../models/Schedule.js';
import Bus from '../models/Bus.js';
import Route from '../models/Route.js';
import { successResponse, errorResponse } from '../utils/response.js';

export const createSchedule = async (req, res, next) => {
    try {
        const scheduleData = req.body;
        // Validate bus and route exist
        const bus = await Bus.findById(scheduleData.bus_id);
        if (!bus) return errorResponse(res, 'Bus not found', 404);
        const route = await Route.findById(scheduleData.route_id);
        if (!route) return errorResponse(res, 'Route not found', 404);
        
        // Set total_seats and available_seats from bus
        scheduleData.total_seats = bus.total_seats;
        scheduleData.available_seats = bus.total_seats;
        
        const scheduleId = await Schedule.create(scheduleData);
        successResponse(res, 'Schedule created', { scheduleId }, 201);
    } catch (err) {
        next(err);
    }
};

export const searchSchedules = async (req, res, next) => {
    try {
        const { origin, destination, date } = req.query;
        if (!origin || !destination || !date) {
            return errorResponse(res, 'origin, destination, and date are required', 400);
        }
        const schedules = await Schedule.searchAvailable(origin, destination, date);
        successResponse(res, 'Available schedules', { schedules });
    } catch (err) {
        next(err);
    }
};

export const getAllSchedules = async (req, res, next) => {
    try {
        const { route_id, bus_id, from_date, to_date, status, search, page, limit, sortBy, sortOrder } = req.query;
        const filters = {
            route_id,
            bus_id,
            from_date,
            to_date,
            status,
            search,
            sortBy,
            sortOrder,
            page: page ? parseInt(page) : null,
            limit: limit ? parseInt(limit) : null,
        };
        const {schedule,total} = await Schedule.findAll(filters);
        successResponse(res, 'Schedules retrieved', { 
                schedules: schedule,
                pagination: {
                    page: filters.page || 1,
                    limit: filters.limit || schedule.length,
                    total: total,
                    totalPages:  filters.limit ? Math.ceil(total / filters.limit):1
                }   
         });
    } catch (err) {
        next(err);
    }
};

export const getScheduleById = async (req, res, next) => {
    try {
        const schedule = await Schedule.findById(req.params.id);
        if (!schedule) return errorResponse(res, 'Schedule not found', 404);
        successResponse(res, 'Schedule retrieved', { schedule });
    } catch (err) {
        next(err);
    }
};

export const updateSchedule = async (req, res, next) => {
    try {
        const schedule = await Schedule.findById(req.params.id);
        if (!schedule) return errorResponse(res, 'Schedule not found', 404);
        // Prevent updating certain fields like available_seats directly
        const { available_seats, ...updateData } = req.body;
        await Schedule.update(req.params.id, updateData);
        successResponse(res, 'Schedule updated');
    } catch (err) {
        next(err);
    }
};

export const cancelSchedule = async (req, res, next) => {
    try {
        const { cancellation_reason } = req.body;
        await Schedule.updateStatus(req.params.id, 'cancelled', cancellation_reason);
        // Optionally, cancel all confirmed bookings for this schedule and refund
        successResponse(res, 'Schedule cancelled');
    } catch (err) {
        next(err);
    }
};

export const getSeatLayout = async (req, res, next) => {
    try {
        const layout = await Schedule.getSeatLayout(req.params.id);
        if (!layout) return errorResponse(res, 'Schedule not found', 404);
        
        // Get locked seats from SeatLock model
        const SeatLock = (await import('../models/SeatLock.js')).default;
        const lockedSeats = await SeatLock.getLockedSeats(req.params.id);
        
        // Get confirmed booked seats from Booking model
        const Booking = (await import('../models/Booking.js')).default;
        // Fetch confirmed bookings for this schedule (simplified)
        const [bookedRows] = await (await import('../config/database.js')).default.execute(
            `SELECT selected_seats FROM bookings WHERE schedule_id = ? AND status = 'confirmed' AND deleted_at IS NULL`,
            [req.params.id]
        );
        const bookedSeats = bookedRows.flatMap(row => row.selected_seats);
        
        successResponse(res, 'Seat layout', {
            total_seats: layout.total_seats,
            seat_layout: layout.seat_layout,
            locked_seats: lockedSeats,
            booked_seats: bookedSeats
        });
    } catch (err) {
        next(err);
    }
};

// deleteSchedule is not implemented in controller, so commenting out for now add now
export const deleteSchedule = async (req, res, next) => {
    try {
        const schedule = await Schedule.findById(req.params.id);
        if (!schedule) return errorResponse(res, 'Schedule not found', 404);
        await Schedule.delete(req.params.id);
        successResponse(res, 'Schedule deleted');
    } catch (err) {
        next(err);
    }
};