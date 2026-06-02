import pool from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

class Booking {
    static async create(bookingData) {
        const {
            user_id, schedule_id, selected_seats, total_amount,
            passenger_details, special_requests, seat_lock_expires_at,
            boarding_point_id, dropping_point_id, boarding_time, dropping_time,
            status, payment_method, payment_status, fare, discount, notes
        } = bookingData;

        const booking_reference = `${Date.now()}-${uuidv4().substring(0, 8).toUpperCase()}`;
        const bookingStatus = status || 'pending_payment';

        const [result] = await pool.execute(
            `INSERT INTO bookings (
                user_id, schedule_id, booking_reference, selected_seats,
                total_amount, passenger_details, special_requests,
                seat_lock_expires_at, status, payment_method, payment_status,
                fare, discount, notes,
                boarding_point_id, dropping_point_id, boarding_time, dropping_time
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                user_id, schedule_id, booking_reference,
                JSON.stringify(selected_seats), total_amount,
                JSON.stringify(passenger_details), special_requests,
                seat_lock_expires_at, bookingStatus,
                payment_method || 'cash', payment_status || 'unpaid',
                fare || null, discount || 0, notes || null,
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

    static async update(id, updateData) {
        const fields = [];
        const values = [];
        for (const [key, value] of Object.entries(updateData)) {
            if (value !== undefined) {
                fields.push(`${key} = ?`);
                if (key === 'selected_seats' || key === 'passenger_details') {
                    values.push(JSON.stringify(value));
                } else {
                    values.push(value);
                }
            }
        }
        if (fields.length === 0) return;
        values.push(id);
        await pool.execute(
            `UPDATE bookings SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ?`,
            values
        );
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
            [userId, String(limit), String(offset)]
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
  static async findAll({ page = 1, limit = 10, search = '', booking_status, payment_status, travel_date, date_from, date_to, route, bus, sortBy, sortOrder }) {
    const offset = (page - 1) * limit;
    const searchQuery = search ? `%${search}%` : null;

    let whereClause = 'WHERE b.deleted_at IS NULL';
    const values = [];
    const countValues = [];

    if (searchQuery) {
        whereClause += ' AND (b.booking_reference LIKE ? OR u.full_name LIKE ? OR u.email LIKE ? OR u.phone LIKE ? OR r.origin LIKE ? OR r.destination LIKE ? OR bus.bus_number LIKE ?)';
        const s = [searchQuery, searchQuery, searchQuery, searchQuery, searchQuery, searchQuery, searchQuery];
        values.push(...s);
        countValues.push(...s);
    }
    if (booking_status) {
        whereClause += ' AND b.status = ?';
        values.push(booking_status);
        countValues.push(booking_status);
    }
    if (payment_status) {
        whereClause += ' AND b.status = ?';
        values.push(payment_status);
        countValues.push(payment_status);
    }
    if (travel_date) {
        whereClause += ' AND DATE(s.departure_time) = ?';
        values.push(travel_date);
        countValues.push(travel_date);
    }
    if (date_from) {
        whereClause += ' AND DATE(b.created_at) >= ?';
        values.push(date_from);
        countValues.push(date_from);
    }
    if (date_to) {
        whereClause += ' AND DATE(b.created_at) <= ?';
        values.push(date_to);
        countValues.push(date_to);
    }
    if (route) {
        whereClause += ' AND CONCAT(r.origin, \' → \', r.destination) = ?';
        values.push(route);
        countValues.push(route);
    }
    if (bus) {
        whereClause += ' AND bus.bus_number = ?';
        values.push(bus);
        countValues.push(bus);
    }

    const allowedSortFields = ['booking_reference', 'user_name', 'route', 'departure_time', 'bus_number', 'seats', 'total_amount', 'payment_status', 'status', 'created_at'];
    const sortColumn = sortBy && allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
    const sortDir = sortOrder === 'ASC' ? 'ASC' : 'DESC';

    let orderClause = 'ORDER BY b.created_at DESC';
    if (sortBy === 'booking_reference') orderClause = `ORDER BY b.booking_reference ${sortDir}`;
    else if (sortBy === 'user_name') orderClause = `ORDER BY u.full_name ${sortDir}`;
    else if (sortBy === 'route') orderClause = `ORDER BY r.origin ${sortDir}`;
    else if (sortBy === 'departure_time') orderClause = `ORDER BY s.departure_time ${sortDir}`;
    else if (sortBy === 'bus_number') orderClause = `ORDER BY bus.bus_number ${sortDir}`;
    else if (sortBy === 'seats') orderClause = `ORDER BY JSON_LENGTH(b.selected_seats) ${sortDir}`;
    else if (sortBy === 'total_amount') orderClause = `ORDER BY b.total_amount ${sortDir}`;
    else if (sortBy === 'payment_status') orderClause = `ORDER BY b.status ${sortDir}`;
    else if (sortBy === 'status') orderClause = `ORDER BY b.status ${sortDir}`;
    else if (sortBy === 'created_at') orderClause = `ORDER BY b.created_at ${sortDir}`;

    const [rows] = await pool.execute(
        `SELECT b.id, b.booking_reference, b.user_id, b.schedule_id,
                b.selected_seats, b.total_amount,
                b.status, b.passenger_details,
                b.created_at, b.confirmed_at, b.cancelled_at,
                b.payment_gateway,
                s.departure_time, s.arrival_time,
                r.origin, r.destination,
                bus.bus_number, bus.bus_type,
                u.full_name AS user_name, u.email AS user_email, u.phone AS user_phone
         FROM bookings b
         JOIN schedules s ON s.id = b.schedule_id
         JOIN routes r ON r.id = s.route_id
         JOIN buses bus ON bus.id = s.bus_id
         JOIN users u ON u.id = b.user_id
         ${whereClause}
         ${orderClause}
         LIMIT ? OFFSET ?`,
        [...values, String(limit), String(offset)]
    );

    const [[{ total }]] = await pool.execute(
        `SELECT COUNT(*) AS total
         FROM bookings b
         JOIN schedules s ON s.id = b.schedule_id
         JOIN routes r ON r.id = s.route_id
         JOIN buses bus ON bus.id = s.bus_id
         JOIN users u ON u.id = b.user_id
         ${whereClause}`,
        countValues
    );

    const bookings = rows.map(row => ({
        ...row,
        selected_seats: row.selected_seats ? JSON.parse(row.selected_seats) : [],
        passenger_details: row.passenger_details ? JSON.parse(row.passenger_details) : [],
        seats: row.selected_seats ? JSON.parse(row.selected_seats).length : (row.seats || 0),
        seat_numbers: row.seat_numbers ? row.seat_numbers.split(',').map(s => s.trim()) : []
    }));

    return { bookings, total };
}
}

export default Booking;