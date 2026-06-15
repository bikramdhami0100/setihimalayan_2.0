import pool from '../config/database.js';

class Otp {
    static async create(phone, otpCode, expiresInMinutes = 5) {
        const [result] = await pool.execute(
            `INSERT INTO otp_codes (phone, otp_code, expires_at)
             VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE))`,
            [phone, otpCode, expiresInMinutes]
        );
        return result.insertId;
    }

    static async verify(phone, otpCode) {
        const [rows] = await pool.execute(
            `SELECT * FROM otp_codes
             WHERE phone = ? AND otp_code = ? AND is_used = FALSE AND expires_at > NOW()
             ORDER BY created_at DESC LIMIT 1`,
            [phone, otpCode]
        );
        return rows[0];
    }

    static async markAsUsed(id) {
        await pool.execute(
            'UPDATE otp_codes SET is_used = TRUE WHERE id = ?',
            [id]
        );
    }

    static async invalidateByPhone(phone) {
        await pool.execute(
            'UPDATE otp_codes SET is_used = TRUE WHERE phone = ? AND is_used = FALSE',
            [phone]
        );
    }

    static async cleanupExpired() {
        await pool.execute(
            'DELETE FROM otp_codes WHERE expires_at <= NOW() OR is_used = TRUE'
        );
    }
}

export default Otp;
