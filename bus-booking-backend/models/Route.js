import pool from '../config/database.js';

class Route {
    static async create(routeData) {
        const {
            origin, destination, distance_km, duration_minutes, base_price,
            stops, description, route_image
        } = routeData;

        const [result] = await pool.execute(
            `INSERT INTO routes (
                origin, destination, distance_km, duration_minutes, base_price,
                stops, description, route_image
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                origin, destination, distance_km || null, duration_minutes || null,
                base_price, stops ? JSON.stringify(stops) : null,
                description, route_image
            ]
        );
        return result.insertId;
    }

    static async findById(id) {
        const [rows] = await pool.execute(
            'SELECT * FROM routes WHERE id = ? AND deleted_at IS NULL',
            [id]
        );
        return rows[0];
    }

    static async findAll(activeOnly = false) {
        let query = 'SELECT * FROM routes WHERE deleted_at IS NULL';
        if (activeOnly) {
            query += ' AND is_active = 1';
        }
        query += ' ORDER BY origin, destination';
        const [rows] = await pool.execute(query);
        return rows;
    }

    static async search(origin, destination) {
        let query = 'SELECT * FROM routes WHERE deleted_at IS NULL';
        const values = [];
        if (origin) {
            query += ' AND origin LIKE ?';
            values.push(`%${origin}%`);
        }
        if (destination) {
            query += ' AND destination LIKE ?';
            values.push(`%${destination}%`);
        }
        query += ' ORDER BY origin, destination';
        const [rows] = await pool.execute(query, values);
        return rows;
    }

    static async update(id, updateData) {
        const fields = [];
        const values = [];
        for (const [key, value] of Object.entries(updateData)) {
            if (value !== undefined) {
                fields.push(`${key} = ?`);
                values.push(key === 'stops' ? JSON.stringify(value) : value);
            }
        }
        values.push(id);
        await pool.execute(
            `UPDATE routes SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ?`,
            values
        );
    }

    static async toggleActive(id, isActive) {
        await pool.execute(
            'UPDATE routes SET is_active = ?, updated_at = NOW() WHERE id = ?',
            [isActive, id]
        );
    }

    static async delete(id) {
        await pool.execute(
            'UPDATE routes SET deleted_at = NOW() WHERE id = ?',
            [id]
        );
    }

    static async incrementPopularity(id) {
        await pool.execute(
            'UPDATE routes SET popularity_score = popularity_score + 1 WHERE id = ?',
            [id]
        );
    }
}

export default Route;