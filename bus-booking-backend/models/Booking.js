import pool from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

class Booking {
    static async create(bookingData) {
        const {
            user_id, schedule_id, selected_seats, total_amount,
            passenger_details, special_requests, seat_lock_expires_at,
            boarding_point_id, dropping_point_id, boarding_time, dropping_time
        } = bookingData;

        const booking_reference = `${Date.now()}-${uuidv4().substring(0, 8).toUpperCase()}`;

        const [result] = await pool.execute(
            `INSERT INTO bookings (
                user_id, schedule_id, booking_reference, selected_seats,
                total_amount, passenger_details, special_requests,
                seat_lock_expires_at, status,
                boarding_point_id, dropping_point_id, boarding_time, dropping_time
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending_payment', ?, ?, ?, ?)`,
            [
                user_id, schedule_id, booking_reference,
                JSON.stringify(selected_seats), total_amount,
                JSON.stringify(passenger_details), special_requests,
                seat_lock_expires_at,
                boarding_point_id || null, dropping_point_id || null,
                boarding_time || null, dropping_time || null
            ]
        );
        return { id: result.insertId, booking_reference };
    }

    static async findById(id) {
        const [rows] = await pool.execute(
            `SELECT b.*, s.departure_time, s.arrival_time, s.base_price,
                    r.origin, r.destination, bus.bus_number, bus.bus_type,
                    bp.point_name AS boarding_point_name,
                    bp.landmark AS boarding_landmark,
                    dp.point_name AS dropping_point_name,
                    dp.landmark AS dropping_landmark
             FROM bookings b
             JOIN schedules s ON s.id = b.schedule_id
             JOIN routes r ON r.id = s.route_id
             JOIN buses bus ON bus.id = s.bus_id
             LEFT JOIN route_points bp ON bp.id = b.boarding_point_id
             LEFT JOIN route_points dp ON dp.id = b.dropping_point_id
             WHERE b.id = ? AND b.deleted_at IS NULL`,
            [id]
        );
        if (rows[0]) {
            rows[0].selected_seats = JSON.parse(rows[0].selected_seats);
            rows[0].passenger_details = JSON.parse(rows[0].passenger_details);
        }
        return rows[0];
    }

    static async findByReference(ref) {
        const [rows] = await pool.execute(
            `SELECT b.*, s.departure_time, s.arrival_time, r.origin, r.destination,
                    bus.bus_number, bus.bus_type,
                    bp.point_name AS boarding_point_name,
                    bp.landmark AS boarding_landmark,
                    dp.point_name AS dropping_point_name,
                    dp.landmark AS dropping_landmark
             FROM bookings b
             JOIN schedules s ON s.id = b.schedule_id
             JOIN routes r ON r.id = s.route_id
             JOIN buses bus ON bus.id = s.bus_id
             LEFT JOIN route_points bp ON bp.id = b.boarding_point_id
             LEFT JOIN route_points dp ON dp.id = b.dropping_point_id
             WHERE b.booking_reference = ? AND b.deleted_at IS NULL`,
            [ref]
        );
        if (rows[0]) {
            rows[0].selected_seats = JSON.parse(rows[0].selected_seats);
            rows[0].passenger_details = JSON.parse(rows[0].passenger_details);
        }
        return rows[0];
    }
// Inside Booking.js

static async updateStatus(id, status, updateData = {}) {
    // Explicitly handle known fields to avoid "0 = ?, 1 = ?" errors
    const fields = ['status = ?'];
    const values = [status];

    if (updateData.cancellation_reason !== undefined) {
        fields.push('cancellation_reason = ?');
        values.push(updateData.cancellation_reason);
    }
    if (updateData.refund_amount !== undefined) {
        fields.push('refund_amount = ?');
        values.push(updateData.refund_amount);
    }
    if (updateData.cancelled_at !== undefined) {
        fields.push('cancelled_at = ?');
        values.push(updateData.cancelled_at);
    }
    if (updateData.confirmed_at !== undefined) {
        fields.push('confirmed_at = ?');
        values.push(updateData.confirmed_at);
    }
    if (updateData.payment_reference !== undefined) {
        fields.push('payment_reference = ?');
        values.push(updateData.payment_reference);
    }
    if (updateData.seat_lock_expires_at !== undefined) {
        fields.push('seat_lock_expires_at = ?');
        values.push(updateData.seat_lock_expires_at);
    }
    // Add any other fields you might update (e.g., ticket_downloaded, etc.)

    values.push(id);
    const query = `UPDATE bookings SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ?`;
    
    console.log('Booking updateStatus query:', query);
    console.log('Values:', values);
    
    await pool.execute(query, values);
    return this.findById(id);
}

static async cancelBooking(id, reason, refundAmount = null) {
    // Pass an OBJECT as the third argument to updateStatus
    return this.updateStatus(id, 'cancelled', {
        cancellation_reason: reason,
        refund_amount: refundAmount,
        cancelled_at: new Date()
    });
}
    static async getUserBookings(userId, limit = 10, offset = 0) {
        const [rows] = await pool.execute(
            `SELECT b.id, b.booking_reference, b.total_amount, b.status, b.created_at,
                    b.confirmed_at, b.selected_seats, b.passenger_details,
                    b.boarding_point_id, b.dropping_point_id,
                    b.boarding_time, b.dropping_time,
                    s.departure_time, s.arrival_time, r.origin, r.destination,
                    bp.point_name AS boarding_point_name,
                    dp.point_name AS dropping_point_name
             FROM bookings b
             JOIN schedules s ON s.id = b.schedule_id
             JOIN routes r ON r.id = s.route_id
             LEFT JOIN route_points bp ON bp.id = b.boarding_point_id
             LEFT JOIN route_points dp ON dp.id = b.dropping_point_id
             WHERE b.user_id = ? AND b.deleted_at IS NULL
             ORDER BY b.created_at DESC
             LIMIT ? OFFSET ?`,
            [userId, limit, offset]
        );
        return rows.map(row => ({
            ...row,
            selected_seats: row.selected_seats ? JSON.parse(row.selected_seats) : [],
            passenger_details: row.passenger_details ? JSON.parse(row.passenger_details) : []
        }));
    }


    static async markTicketDownloaded(bookingId) {
        await pool.execute(
            `UPDATE bookings SET ticket_downloaded = TRUE, ticket_downloaded_at = NOW()
             WHERE id = ?`,
            [bookingId]
        );
    }

    static async delete(id) {
        await pool.execute(
            'UPDATE bookings SET deleted_at = NOW() WHERE id = ?',
            [id]
        );
    }
  static async findAll({ page = 1, limit = 10, search = '' }) {
    const offset = (page - 1) * limit;
    const searchQuery = `%${search}%`;

    const [rows] = await pool.execute(
        `SELECT b.id, b.booking_reference, b.total_amount, b.status, b.created_at,
                b.confirmed_at, b.boarding_point_id, b.dropping_point_id,
                b.boarding_time, b.dropping_time,
                s.departure_time, r.origin, r.destination,
                bus.bus_number, bus.bus_type, u.full_name AS user_name,
                bp.point_name AS boarding_point_name,
                dp.point_name AS dropping_point_name
         FROM bookings b
         JOIN schedules s ON s.id = b.schedule_id
         JOIN routes r ON r.id = s.route_id
         JOIN buses bus ON bus.id = s.bus_id
         JOIN users u ON u.id = b.user_id
         LEFT JOIN route_points bp ON bp.id = b.boarding_point_id
         LEFT JOIN route_points dp ON dp.id = b.dropping_point_id
         WHERE (b.booking_reference LIKE ? 
                OR u.full_name LIKE ? 
                OR r.origin LIKE ? 
                OR r.destination LIKE ?)
         AND b.deleted_at IS NULL
         ORDER BY b.created_at DESC
         LIMIT ? OFFSET ?`,
        [searchQuery, searchQuery, searchQuery, searchQuery, limit, offset]
    );

    const [[{ total }]] = await pool.execute(
        `SELECT COUNT(*) AS total
         FROM bookings b
         JOIN schedules s ON s.id = b.schedule_id
         JOIN routes r ON r.id = s.route_id
         JOIN buses bus ON bus.id = s.bus_id
         JOIN users u ON u.id = b.user_id
         WHERE (b.booking_reference LIKE ? 
                OR u.full_name LIKE ? 
                OR r.origin LIKE ? 
                OR r.destination LIKE ?)
         AND b.deleted_at IS NULL`,
        [searchQuery, searchQuery, searchQuery, searchQuery]
    );

    return { bookings: rows, total };
}
}

export default Booking;