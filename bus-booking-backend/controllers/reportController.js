import pool from '../config/database.js';
import { successResponse, errorResponse } from '../utils/response.js';
import moment from 'moment';

export const getDailyRevenue = async (req, res, next) => {
    try {
        const { start_date, end_date } = req.query;
        if (!start_date || !end_date) return errorResponse(res, 'start_date and end_date required', 400);
        
        const [rows] = await pool.execute(
            `SELECT * FROM daily_revenue_report WHERE date BETWEEN ? AND ? ORDER BY date DESC`,
            [start_date, end_date]
        );
        successResponse(res, 'Daily revenue report', { report: rows });
    } catch (err) {
        next(err);
    }
};

export const getPopularRoutes = async (req, res, next) => {
    try {
        const [rows] = await pool.execute(`SELECT * FROM popular_routes LIMIT 10`);
        successResponse(res, 'Popular routes', { routes: rows });
    } catch (err) {
        next(err);
    }
};

export const getBookingStats = async (req, res, next) => {
    try {
        const { start_date, end_date } = req.query;
        const [rows] = await pool.execute(
            `CALL GetBookingStats(?, ?)`,
            [start_date || '2024-01-01', end_date || moment().format('YYYY-MM-DD')]
        );
        // Stored procedure returns multiple result sets; first one is stats
        successResponse(res, 'Booking statistics', { stats: rows[0] });
    } catch (err) {
        next(err);
    }
};

export const getUtilizationReport = async (req, res, next) => {
    try {
        const [rows] = await pool.execute(
            `SELECT b.bus_number, b.bus_type, COUNT(s.id) as total_schedules,
                    SUM(s.total_seats - s.available_seats) as total_passengers,
                    AVG((s.total_seats - s.available_seats) / s.total_seats * 100) as avg_occupancy
             FROM buses b
             JOIN schedules s ON s.bus_id = b.id
             WHERE s.status = 'completed' AND s.departure_time >= DATE_SUB(NOW(), INTERVAL 30 DAY)
             GROUP BY b.id
             ORDER BY avg_occupancy DESC`
        );
        successResponse(res, 'Bus utilization report', { utilization: rows });
    } catch (err) {
        next(err);
    }
};

export const getAdminDashboard = async (req, res, next) => {
    try {
        const [totalBookings] = await pool.execute(`SELECT COUNT(*) as count FROM bookings WHERE deleted_at IS NULL`);
        const [totalRevenue] = await pool.execute(`SELECT SUM(total_amount) as revenue FROM bookings WHERE status = 'confirmed'`);
        const [upcomingSchedules] = await pool.execute(
            `SELECT COUNT(*) as count FROM schedules WHERE departure_time > NOW() AND status = 'scheduled'`
        );
        const [totalUsers] = await pool.execute(`SELECT COUNT(*) as count FROM users WHERE role = 'passenger' AND deleted_at IS NULL`);
        
        successResponse(res, 'Admin dashboard', {
            total_bookings: totalBookings[0].count,
            total_revenue: totalRevenue[0].revenue || 0,
            upcoming_schedules: upcomingSchedules[0].count,
            total_users: totalUsers[0].count
        });
    } catch (err) {
        next(err);
    }
};