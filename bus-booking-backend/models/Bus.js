import pool from '../config/database.js';

class Bus {
    static normalizeStatus(status) {
        return status === 'inactive' ? 'retired' : status;
    }

    static async create(busData) {
        const {
            bus_number, registration_number, total_seats, seat_layout, amenities,
            bus_type, status = 'active', manufacturer, model, year, color, license_plate,
            insurance_expiry, fitness_expiry, notes
        } = busData;


        const [result] = await pool.execute(
              `INSERT INTO buses (
                bus_number, registration_number, total_seats, seat_layout, amenities,
                bus_type, status, manufacturer, model, year, color, license_plate,
                insurance_expiry, fitness_expiry, notes
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                bus_number, registration_number, total_seats,
                JSON.stringify(seat_layout),
                amenities ? JSON.stringify(amenities) : null,
                bus_type, Bus.normalizeStatus(status),
                manufacturer, model, year, color, license_plate,
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

    static async findByRegistrationNumber(regNumber) {
        const [rows] = await pool.execute(
            'SELECT * FROM buses WHERE registration_number = ? AND deleted_at IS NULL',
            [regNumber]
        );
        return rows[0];
    }

    static async findAll(filters = {}) {
        let query = 'SELECT * FROM buses WHERE deleted_at IS NULL';
        let countQuery = 'SELECT COUNT(*) as total FROM buses WHERE deleted_at IS NULL';
        const values = [];
        const countValues = [];

        const addFilter = (condition, value) => {
            query += ` AND ${condition}`;
            countQuery += ` AND ${condition}`;
            values.push(value);
            countValues.push(value);
        };

        if (filters.bus_type) addFilter('bus_type = ?', filters.bus_type);
        if (filters.status) addFilter('status = ?', filters.status);
        if (filters.search) {
            const searchTerm = `%${filters.search}%`;
            query += ' AND (bus_number LIKE ? OR registration_number LIKE ? OR license_plate LIKE ? OR bus_type LIKE ?)';
            countQuery += ' AND (bus_number LIKE ? OR registration_number LIKE ? OR license_plate LIKE ? OR bus_type LIKE ?)';
            values.push(searchTerm, searchTerm, searchTerm, searchTerm);
            countValues.push(searchTerm, searchTerm, searchTerm, searchTerm);
        }

        // Sorting
        const allowedSortFields = ['bus_number', 'bus_type', 'status', 'total_seats', 'year', 'created_at', 'registration_number', 'manufacturer'];
        const sortBy = filters.sortBy && allowedSortFields.includes(filters.sortBy) ? filters.sortBy : 'created_at';
        const sortOrder = filters.sortOrder === 'ASC' ? 'ASC' : 'DESC';
        query += ` ORDER BY ${sortBy} ${sortOrder}`;

        if (filters.page && filters.limit) {
            const offset = (filters.page - 1) * filters.limit;
            query += ' LIMIT ? OFFSET ?';
            values.push(String(filters.limit), String(offset));
        }

        const [rows] = await pool.execute(query, values);
        const [countResult] = await pool.execute(countQuery, countValues);
        
        return {
            buses: rows,
            total: countResult[0].total
        };
    }

    static async update(id, updateData) {
        const fields = [];
        const values = [];
        for (const [key, value] of Object.entries(updateData)) {
            if (value !== undefined) {
                fields.push(`${key} = ?`);
                if (key === 'seat_layout' || key === 'amenities') {
                    values.push(JSON.stringify(value));
                } else if (key === 'status') {
                    values.push(Bus.normalizeStatus(value));
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
            [Bus.normalizeStatus(status), id]
        );
    }

    static async delete(id) {
        const [result] = await pool.execute(
            'UPDATE buses SET deleted_at = NOW() WHERE id = ?',
            [id]
        );
        return result.affectedRows;
    }
}

export default Bus;