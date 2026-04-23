import pool from '../config/database.js';

class Bus {
    static async create(busData) {
        const {
            bus_number, registration_number, total_seats, seat_layout, amenities,
            bus_type, manufacturer, model, year, color, license_plate,
            insurance_expiry, fitness_expiry, notes
        } = busData;

        const [result] = await pool.execute(
            `INSERT INTO buses (
                bus_number, registration_number, total_seats, seat_layout, amenities,
                bus_type, manufacturer, model, year, color, license_plate,
                insurance_expiry, fitness_expiry, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                bus_number, registration_number, total_seats,
                JSON.stringify(seat_layout), amenities ? JSON.stringify(amenities) : null,
                bus_type, manufacturer, model, year, color, license_plate,
                insurance_expiry, fitness_expiry, notes
            ]
        );
        return result.insertId;
    }

    static async findById(id) {
        const [rows] = await pool.execute(
            'SELECT * FROM buses WHERE id = ? AND deleted_at IS NULL',
            [id]
        );
        return rows[0];
    }

    static async findByBusNumber(busNumber) {
        const [rows] = await pool.execute(
            'SELECT * FROM buses WHERE bus_number = ? AND deleted_at IS NULL',
            [busNumber]
        );
        return rows[0];
    }

    static async findAll(filters = {}) {
        let query = 'SELECT * FROM buses WHERE deleted_at IS NULL';
        const values = [];
        if (filters.bus_type) {
            query += ' AND bus_type = ?';
            values.push(filters.bus_type);
        }
        if (filters.status) {
            query += ' AND status = ?';
            values.push(filters.status);
        }
        query += ' ORDER BY created_at DESC';
        const [rows] = await pool.execute(query, values);
        return rows;
    }

    static async update(id, updateData) {
        const fields = [];
        const values = [];
        for (const [key, value] of Object.entries(updateData)) {
            if (value !== undefined) {
                fields.push(`${key} = ?`);
                if (key === 'seat_layout' || key === 'amenities') {
                    values.push(JSON.stringify(value));
                } else {
                    values.push(value);
                }
            }
        }
        values.push(id);
        await pool.execute(
            `UPDATE buses SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ?`,
            values
        );
    }

    static async updateStatus(id, status) {
        await pool.execute(
            'UPDATE buses SET status = ?, updated_at = NOW() WHERE id = ?',
            [status, id]
        );
    }

    static async delete(id) {
        await pool.execute(
            'UPDATE buses SET deleted_at = NOW() WHERE id = ?',
            [id]
        );
    }
}

export default Bus;