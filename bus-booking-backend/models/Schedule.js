import pool from '../config/database.js';

class Schedule {
    static async create(scheduleData) {
        const {
            bus_id, route_id, departure_time, arrival_time, base_price,
            available_seats, total_seats, driver_name, driver_phone,
            conductor_name, conductor_phone, notes
        } = scheduleData;

        const [result] = await pool.execute(
            `INSERT INTO schedules (
                bus_id, route_id, departure_time, arrival_time, base_price,
                available_seats, total_seats, driver_name, driver_phone,
                conductor_name, conductor_phone, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                bus_id, route_id, departure_time, arrival_time, base_price,
                available_seats, total_seats, driver_name, driver_phone,
                conductor_name, conductor_phone, notes
            ]
        );
        return result.insertId;
    }

    static async findById(id) {
        const [rows] = await pool.execute(
            `SELECT s.*, b.bus_number, b.bus_type, b.amenities,
                    r.origin, r.destination, r.distance_km
             FROM schedules s
             JOIN buses b ON b.id = s.bus_id
             JOIN routes r ON r.id = s.route_id
             WHERE s.id = ? AND s.deleted_at IS NULL`,
            [id]
        );
        return rows[0];
    }

    static async searchAvailable(origin, destination, date) {
        const [rows] = await pool.execute(
            `SELECT s.*, b.bus_number, b.bus_type, b.amenities,
                    r.origin, r.destination, r.distance_km
             FROM schedules s
             JOIN buses b ON b.id = s.bus_id
             JOIN routes r ON r.id = s.route_id
             WHERE r.origin = ? AND r.destination = ?
               AND DATE(s.departure_time) = ?
               AND s.status = 'scheduled'
               AND s.available_seats > 0
               AND s.deleted_at IS NULL
             ORDER BY s.departure_time ASC`,
            [origin, destination, date]
        );
        return rows;
    }

 
    static async findAll(filters = {}) {
        // order of clauses: WHERE -> ORDER BY -> LIMIT
        
    let query = `
        SELECT s.*, b.bus_number, b.bus_type, r.origin, r.destination
        FROM schedules s
        JOIN buses b ON b.id = s.bus_id
        JOIN routes r ON r.id = s.route_id
        WHERE s.deleted_at IS NULL 
    `;
    let countQuery = `
        SELECT COUNT(*) as total
        FROM schedules s
        JOIN buses b ON b.id = s.bus_id
        JOIN routes r ON r.id = s.route_id
        WHERE s.deleted_at IS NULL
    `;

    const values = [];

    if (filters.route_id) {
        query += ' AND s.route_id = ?';
        values.push(filters.route_id);
    }

    if (filters.bus_id) {
        query += ' AND s.bus_id = ?';
        values.push(filters.bus_id);
    }

    if (filters.status) {
        query += ' AND s.status = ?';
        values.push(filters.status);
    }

    if (filters.from_date) {
        query += ' AND DATE(s.departure_time) >= ?';
        values.push(filters.from_date);
    }

    if (filters.to_date) {
        query += ' AND DATE(s.departure_time) <= ?';
        values.push(filters.to_date);
    }

    if (filters.search) {
        const search = `%${filters.search}%`;
        query += ' AND (b.bus_number LIKE ? OR r.origin LIKE ? OR r.destination LIKE ?)';
        values.push(search, search, search);
    }

    // ✅ ORDER BY comes BEFORE LIMIT
    query += ' ORDER BY s.departure_time ASC';

    if (filters.page && filters.limit) {
        const offset = (filters.page - 1) * filters.limit;
        query += ' LIMIT ? OFFSET ?';
        values.push(Number(filters.limit), Number(offset));
    } else if (filters.limit) {
        query += ' LIMIT ?';
        values.push(Number(filters.limit));
    }

    const [rows] = await pool.execute(query, values);
    const [countRows] = await pool.execute(countQuery);
    return { schedule: rows, total: countRows[0].total  };
}

    static async updateAvailableSeats(scheduleId, seatCountChange) {
        await pool.execute(
            'UPDATE schedules SET available_seats = available_seats + ? WHERE id = ?',
            [seatCountChange, scheduleId]
        );
    }

    static async updateStatus(scheduleId, status, cancellationReason = null) {
        await pool.execute(
            `UPDATE schedules SET status = ?, cancellation_reason = ?, updated_at = NOW() 
             WHERE id = ?`,
            [status, cancellationReason, scheduleId]
        );
    }

    static async updateDelay(scheduleId, delayMinutes) {
        await pool.execute(
            `UPDATE schedules SET delay_minutes = ?, status = 'delayed', updated_at = NOW()
             WHERE id = ?`,
            [delayMinutes, scheduleId]
        );
    }

    static async getSeatLayout(scheduleId) {
        const [rows] = await pool.execute(
            `SELECT b.seat_layout, s.total_seats
             FROM schedules s
             JOIN buses b ON b.id = s.bus_id
             WHERE s.id = ?`,
            [scheduleId]
        );
        return rows[0];
    }

    static async delete(id) {
        await pool.execute(
            'UPDATE schedules SET deleted_at = NOW() WHERE id = ?',
            [id]
        );
    }
}

export default Schedule;