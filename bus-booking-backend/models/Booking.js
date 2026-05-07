import pool from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

class Booking {
    static async create(bookingData) {
        const {
            user_id, schedule_id, selected_seats, total_amount,
            passenger_details, special_requests, seat_lock_expires_at
        } = bookingData;

        const booking_reference = `${Date.now()}-${uuidv4().substring(0, 8).toUpperCase()}`;

        const [result] = await pool.execute(
            `INSERT INTO bookings (
                user_id, schedule_id, booking_reference, selected_seats,
                total_amount, passenger_details, special_requests,
                seat_lock_expires_at, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending_payment')`,
            [
                user_id, schedule_id, booking_reference,
                JSON.stringify(selected_seats), total_amount,
                JSON.stringify(passenger_details), special_requests,
                seat_lock_expires_at
            ]
        );
        return { id: result.insertId, booking_reference };
    }

    static async findById(id) {
        const [rows] = await pool.execute(
            `SELECT b.*, s.departure_time, s.arrival_time, s.base_price,
                    r.origin, r.destination, bus.bus_number, bus.bus_type
             FROM bookings b
             JOIN schedules s ON s.id = b.schedule_id
             JOIN routes r ON r.id = s.route_id
             JOIN buses bus ON bus.id = s.bus_id
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
                    bus.bus_number, bus.bus_type
             FROM bookings b
             JOIN schedules s ON s.id = b.schedule_id
             JOIN routes r ON r.id = s.route_id
             JOIN buses bus ON bus.id = s.bus_id
             WHERE b.booking_reference = ? AND b.deleted_at IS NULL`,
            [ref]
        );
        if (rows[0]) {
            rows[0].selected_seats = JSON.parse(rows[0].selected_seats);
            rows[0].passenger_details = JSON.parse(rows[0].passenger_details);
        }
        return rows[0];
    }

    static async updateStatus(id, status, extraFields = {}) {
        const fields = ['status = ?'];
        const values = [status];
        if (status === 'confirmed') {
            fields.push('confirmed_at = NOW()');
        }
        if (status === 'cancelled') {
            fields.push('cancelled_at = NOW()');
        }
        for (const [key, value] of Object.entries(extraFields)) {
            fields.push(`${key} = ?`);
            values.push(value);
        }
        values.push(id);
        await pool.execute(
            `UPDATE bookings SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ?`,
            values
        );
    }

    static async getUserBookings(userId, limit = 10, offset = 0) {
        const [rows] = await pool.execute(
            `SELECT b.id, b.booking_reference, b.total_amount, b.status, b.created_at,
                    b.confirmed_at, s.departure_time, r.origin, r.destination
             FROM bookings b
             JOIN schedules s ON s.id = b.schedule_id
             JOIN routes r ON r.id = s.route_id
             WHERE b.user_id = ? AND b.deleted_at IS NULL
             ORDER BY b.created_at DESC
             LIMIT ? OFFSET ?`,
            [userId, limit, offset]
        );
        return rows;
    }

    static async cancelBooking(id, reason, refundAmount = null) {
        const booking = await this.findById(id);
        if (!booking) throw new Error('Booking not found');

        await pool.execute(
            `UPDATE bookings SET status = 'cancelled', cancelled_at = NOW(),
             cancellation_reason = ?, refund_amount = ?, updated_at = NOW()
             WHERE id = ?`,
            [reason, refundAmount, id]
        );

        // Restore seats if booking was confirmed
        if (booking.status === 'confirmed') {
            const seatCount = booking.selected_seats.length;
            await pool.execute(
                'UPDATE schedules SET available_seats = available_seats + ? WHERE id = ?',
                [seatCount, booking.schedule_id]
            );
        }
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
                b.confirmed_at, s.departure_time, r.origin, r.destination,
                bus.bus_number, bus.bus_type, u.full_name AS user_name
         FROM bookings b
         JOIN schedules s ON s.id = b.schedule_id
         JOIN routes r ON r.id = s.route_id
         JOIN buses bus ON bus.id = s.bus_id
         JOIN users u ON u.id = b.user_id
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