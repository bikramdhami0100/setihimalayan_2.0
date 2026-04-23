import pool from '../config/database.js';

class AuditLog {
    static async log({ userId, action, entity, entityId, oldValues, newValues, ipAddress, userAgent }) {
        await pool.execute(
            `INSERT INTO audit_logs (
                user_id, action, entity, entity_id, old_values, new_values,
                ip_address, user_agent
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                userId || null,
                action,
                entity,
                entityId || null,
                oldValues ? JSON.stringify(oldValues) : null,
                newValues ? JSON.stringify(newValues) : null,
                ipAddress || null,
                userAgent || null
            ]
        );
    }

    static async getForEntity(entity, entityId, limit = 50) {
        const [rows] = await pool.execute(
            `SELECT al.*, u.full_name as user_name
             FROM audit_logs al
             LEFT JOIN users u ON u.id = al.user_id
             WHERE al.entity = ? AND al.entity_id = ?
             ORDER BY al.created_at DESC
             LIMIT ?`,
            [entity, entityId, limit]
        );
        return rows;
    }

    static async getForUser(userId, limit = 50) {
        const [rows] = await pool.execute(
            `SELECT * FROM audit_logs
             WHERE user_id = ?
             ORDER BY created_at DESC
             LIMIT ?`,
            [userId, limit]
        );
        return rows;
    }

    static async getByAction(action, limit = 50) {
        const [rows] = await pool.execute(
            `SELECT * FROM audit_logs
             WHERE action = ?
             ORDER BY created_at DESC
             LIMIT ?`,
            [action, limit]
        );
        return rows;
    }
}

export default AuditLog;