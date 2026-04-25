import Joi from 'joi';
import { errorResponse } from '../utils/response.js';

/**
 * Generic validation middleware using Joi schema
 * @param {Joi.Schema} schema - Joi validation schema
 * @returns {Function} Express middleware
 */
export const validate = (schema) => {
    return (req, res, next) => {
        const { error } = schema.validate(req.body, { abortEarly: false });
        if (error) {
            const errors = error.details.map(detail => detail.message);
            return errorResponse(res, 'Validation error', 400, errors);
        }
        next();
    };
};

// ------------------- Auth Schemas -------------------
export const registerSchema = Joi.object({
    email: Joi.string().email().required(),
    phone: Joi.string().pattern(/^[0-9]{10}$/).required(),
    full_name: Joi.string().min(3).max(100).required(),
    password: Joi.string().min(6).required(),
    role: Joi.string().valid('passenger', 'admin').default('passenger')
});

export const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
});

export const changePasswordSchema = Joi.object({
    email: Joi.string().email().required(),
    newPassword: Joi.string().min(6).required(),
    token: Joi.string().required()
});

export const resetPasswordRequestSchema = Joi.object({
    email: Joi.string().email().required()
});

export const resetPasswordSchema = Joi.object({
    token: Joi.string().required(),
    newPassword: Joi.string().min(6).required(),
    confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required()
});

// ------------------- Bus Schemas -------------------
export const busSchema = Joi.object({
    bus_number: Joi.string().required(),
    registration_number: Joi.string().optional(),
    total_seats: Joi.number().integer().min(10).max(80).required(),
    seat_layout: Joi.object().required(),
    amenities: Joi.array().items(Joi.string()).optional(),
    bus_type: Joi.string().valid('Standard', 'Luxury', 'Sleeper', 'Mini').default('Standard'),
    manufacturer: Joi.string().optional(),
    model: Joi.string().optional(),
    year: Joi.number().integer().min(1990).max(new Date().getFullYear()).optional(),
    color: Joi.string().optional(),
    license_plate: Joi.string().optional(),
    insurance_expiry: Joi.date().optional(),
    fitness_expiry: Joi.date().optional(),
    notes: Joi.string().optional()
});

export const busUpdateSchema = Joi.object({
    bus_number: Joi.string().optional(),
    registration_number: Joi.string().optional(),
    total_seats: Joi.number().integer().min(10).max(80).optional(),
    seat_layout: Joi.object().optional(),
    amenities: Joi.array().items(Joi.string()).optional(),
    bus_type: Joi.string().valid('Standard', 'Luxury', 'Sleeper', 'Mini').optional(),
    status: Joi.string().valid('active', 'maintenance', 'retired').optional(),
    manufacturer: Joi.string().optional(),
    model: Joi.string().optional(),
    year: Joi.number().integer().min(1990).max(new Date().getFullYear()).optional(),
    color: Joi.string().optional(),
    license_plate: Joi.string().optional(),
    insurance_expiry: Joi.date().optional(),
    fitness_expiry: Joi.date().optional(),
    notes: Joi.string().optional()
});

// ------------------- Route Schemas -------------------
export const routeSchema = Joi.object({
    origin: Joi.string().required(),
    destination: Joi.string().required(),
    distance_km: Joi.number().positive().optional(),
    duration_minutes: Joi.number().integer().positive().optional(),
    base_price: Joi.number().positive().required(),
    stops: Joi.array().items(Joi.object({
        location: Joi.string().required(),
        arrival_time: Joi.date().optional(),
        departure_time: Joi.date().optional(),
        stop_order: Joi.number().integer().optional()
    })).optional(),
    description: Joi.string().optional(),
    route_image: Joi.string().uri().optional()
});

export const routeUpdateSchema = Joi.object({
    origin: Joi.string().optional(),
    destination: Joi.string().optional(),
    distance_km: Joi.number().positive().optional(),
    duration_minutes: Joi.number().integer().positive().optional(),
    base_price: Joi.number().positive().optional(),
    stops: Joi.array().items(Joi.object()).optional(),
    description: Joi.string().optional(),
    is_active: Joi.boolean().optional(),
    route_image: Joi.string().uri().optional()
});

// ------------------- Schedule Schemas -------------------
export const scheduleSchema = Joi.object({
    bus_id: Joi.number().integer().required(),
    route_id: Joi.number().integer().required(),
    departure_time: Joi.date().greater('now').required(),
    arrival_time: Joi.date().greater(Joi.ref('departure_time')).required(),
    base_price: Joi.number().positive().required(),
    driver_name: Joi.string().optional(),
    driver_phone: Joi.string().pattern(/^[0-9]{10}$/).optional(),
    conductor_name: Joi.string().optional(),
    conductor_phone: Joi.string().pattern(/^[0-9]{10}$/).optional(),
    notes: Joi.string().optional()
});

export const scheduleUpdateSchema = Joi.object({
    departure_time: Joi.date().greater('now').optional(),
    arrival_time: Joi.date().optional(),
    base_price: Joi.number().positive().optional(),
    driver_name: Joi.string().optional(),
    driver_phone: Joi.string().pattern(/^[0-9]{10}$/).optional(),
    conductor_name: Joi.string().optional(),
    conductor_phone: Joi.string().pattern(/^[0-9]{10}$/).optional(),
    notes: Joi.string().optional(),
    status: Joi.string().valid('scheduled', 'cancelled', 'completed', 'delayed').optional()
});

// ------------------- Booking Schemas -------------------
export const bookingSchema = Joi.object({
    schedule_id: Joi.number().integer().required(),
    selected_seats: Joi.array().items(Joi.string()).min(1).required(),
    passenger_details: Joi.object({
        name: Joi.string().required(),
        age: Joi.number().integer().min(1).max(120).optional(),
        gender: Joi.string().valid('M', 'F', 'Other').optional(),
        email: Joi.string().email().optional(),
        phone: Joi.string().pattern(/^[0-9]{10}$/).optional()
    }).required(),
    special_requests: Joi.string().allow('').optional()
});

export const cancelBookingSchema = Joi.object({
    cancellation_reason: Joi.string().required()
});

// ------------------- Payment Schemas -------------------
export const paymentInitiateSchema = Joi.object({
    booking_id: Joi.number().integer().required(),
    gateway: Joi.string().valid('esewa', 'khalti', 'connectips').required()
});

// ------------------- Report Schemas -------------------
export const dateRangeSchema = Joi.object({
    start_date: Joi.date().required(),
    end_date: Joi.date().min(Joi.ref('start_date')).required()
});