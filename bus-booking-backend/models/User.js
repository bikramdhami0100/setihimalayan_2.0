import pool from '../config/database.js';
import { hashPassword } from '../utils/bcryptHelper.js';

class User {
    static async create(userData) {
        const { email, phone, full_name, password, role = 'passenger' } = userData;
        const hashedPassword = await hashPassword(password);
        const [result] = await pool.execute(
            `INSERT INTO users (email, phone, full_name, password_hash, role) 
             VALUES (?, ?, ?, ?, ?)`,
            [email, phone, full_name, hashedPassword, role]
        );
        return result.insertId;
    }

    static async findByEmail(email) {
        const [rows] = await pool.execute(
            'SELECT * FROM users WHERE email = ? AND deleted_at IS NULL',
            [email]
        );
        return rows[0];
    }

    static async findByPhone(phone) {
        const [rows] = await pool.execute(
            'SELECT * FROM users WHERE phone = ? AND deleted_at IS NULL',
            [phone]
        );
        return rows[0];
    }

    static async findById(id) {
        const [rows] = await pool.execute(
            `SELECT id, email, phone, full_name, role, status, is_email_verified, 
                    profile_image, date_of_birth, address, city, state, country, postal_code, 
                    created_at, last_login_at 
             FROM users WHERE id = ? AND deleted_at IS NULL`,
            [id]
        );
        return rows[0];
    }

    static async updateRefreshToken(userId, refreshTokenHash) {
        await pool.execute(
            'UPDATE users SET refresh_token_hash = ? WHERE id = ?',
            [refreshTokenHash, userId]
        );
    }

    static async updateProfile(userId, updateData) {
        const fields = [];
        const values = [];
        for (const [key, value] of Object.entries(updateData)) {
            if (value !== undefined) {
                fields.push(`${key} = ?`);
                values.push(value);
            }
        }
        values.push(userId);
        await pool.execute(
            `UPDATE users SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ?`,
            values
        );
    }

    static async updateRole(userId, role) {
        await pool.execute(
            'UPDATE users SET role = ?, updated_at = NOW() WHERE id = ?',
            [role, userId]
        );
    }

    static async updateLastLogin(userId) {
        await pool.execute(
            'UPDATE users SET last_login_at = NOW() WHERE id = ?',
            [userId]
        );
    }

    static async verifyEmail(userId) {
        await pool.execute(
            `UPDATE users SET is_email_verified = TRUE, email_verified_at = NOW() WHERE id = ?`,
            [userId]
        );
    }

    static async updateStatus(userId, status) {
        await pool.execute(
            'UPDATE users SET status = ? WHERE id = ?',
            [status, userId]
        );
    }

    static async getAll(filters = {}) {
        let query = 'SELECT id, email, phone, full_name, role, status, created_at FROM users WHERE deleted_at IS NULL';
        const values = [];
        if (filters.role) {
            query += ' AND role = ?';
            values.push(filters.role);
        }
        if (filters.status) {
            query += ' AND status = ?';
            values.push(filters.status);
        }
        query += ' ORDER BY created_at DESC';
        const [rows] = await pool.execute(query, values);
        return rows;
    }

    static async delete(userId) {
        await pool.execute(
            'UPDATE users SET deleted_at = NOW() WHERE id = ?',
            [userId]
        );
    }
}

export default User;