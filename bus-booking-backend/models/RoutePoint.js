import pool from '../config/database.js';

class RoutePoint {
    static async create(data) {
        const {
            route_id, point_name, point_order, arrival_time, departure_time,
            additional_fare, is_boarding_point, is_dropping_point, landmark, notes
        } = data;

        const [result] = await pool.execute(
            `INSERT INTO route_points (
                route_id, point_name, point_order, arrival_time, departure_time,
                additional_fare, is_boarding_point, is_dropping_point, landmark, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                route_id, point_name, point_order, arrival_time, departure_time,
                additional_fare ?? 0, is_boarding_point ?? true, is_dropping_point ?? true,
                landmark, notes
            ]
        );
        return result.insertId;
    }

    static async findByRouteId(routeId, { boardingOnly = false, droppingOnly = false } = {}) {
        let query = 'SELECT * FROM route_points WHERE route_id = ?';
        const params = [routeId];

        if (boardingOnly) {
            query += ' AND is_boarding_point = TRUE';
        }
        if (droppingOnly) {
            query += ' AND is_dropping_point = TRUE';
        }

        query += ' ORDER BY point_order ASC';

        const [rows] = await pool.execute(query, params);
        return rows;
    }

    static async findById(id) {
        const [rows] = await pool.execute(
            `SELECT rp.*, r.origin, r.destination
             FROM route_points rp
             JOIN routes r ON r.id = rp.route_id
             WHERE rp.id = ?`,
            [id]
        );
        return rows[0];
    }

    static async findBySchedule(scheduleId) {
        const [rows] = await pool.execute(
            `SELECT rp.*, srp.expected_arrival, srp.expected_departure,
                    srp.actual_arrival, srp.actual_departure,
                    srp.status as schedule_status, srp.delay_minutes
             FROM route_points rp
             JOIN schedule_route_points srp ON srp.route_point_id = rp.id
             WHERE srp.schedule_id = ?
             ORDER BY rp.point_order ASC`,
            [scheduleId]
        );
        return rows;
    }

    static async update(id, data) {
        const fields = [];
        const values = [];

        const allowed = [
            'point_name', 'point_order', 'arrival_time', 'departure_time',
            'additional_fare', 'is_boarding_point', 'is_dropping_point',
            'landmark', 'notes'
        ];

        for (const key of allowed) {
            if (data[key] !== undefined) {
                fields.push(`${key} = ?`);
                values.push(data[key]);
            }
        }

        if (fields.length === 0) return;

        values.push(id);
        await pool.execute(
            `UPDATE route_points SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ?`,
            values
        );
    }

    static async delete(id) {
        await pool.execute('DELETE FROM route_points WHERE id = ?', [id]);
    }

    static async bulkCreate(routeId, points) {
        const conn = await pool.getConnection();
        try {
            await conn.beginTransaction();

            for (const point of points) {
                await conn.execute(
                    `INSERT INTO route_points (
                        route_id, point_name, point_order, arrival_time, departure_time,
                        additional_fare, is_boarding_point, is_dropping_point, landmark, notes
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        routeId, point.point_name, point.point_order,
                        point.arrival_time || null, point.departure_time || null,
                        point.additional_fare ?? 0,
                        point.is_boarding_point ?? true, point.is_dropping_point ?? true,
                        point.landmark || null, point.notes || null
                    ]
                );
            }

            await conn.commit();
        } catch (err) {
            await conn.rollback();
            throw err;
        } finally {
            conn.release();
        }
    }
}

export default RoutePoint;
