import pool from '../config/database.js';
import { hashPassword } from '../utils/bcryptHelper.js';

class User {
    static async create(userData) {
        const { email, phone, full_name, password, role = 'passenger', status = 'active',
                date_of_birth, address, city, state, country, postal_code, profile_image } = userData;
        const hashedPassword = await hashPassword(password);
        const [result] = await pool.execute(
            `INSERT INTO users (email, phone, full_name, password_hash, role, status,
                                date_of_birth, address, city, state, country, postal_code, profile_image) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [email, phone || null, full_name, hashedPassword, role, status,
             date_of_birth || null, address || null, city || null, state || null, country || null, postal_code || null, profile_image || null]
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
                    notification_preferences, language, refresh_token_hash,
                    created_at, updated_at, last_login_at 
             FROM users WHERE id = ? AND deleted_at IS NULL`,
            [id]
        );
        if (rows[0]?.notification_preferences && typeof rows[0].notification_preferences === 'string') {
            try {
                rows[0].notification_preferences = JSON.parse(rows[0].notification_preferences);
            } catch (e) {
                rows[0].notification_preferences = {};
            }
        }
        return rows[0];
    }

    static async updateRefreshToken(userId, refreshTokenHash) {
        await pool.execute(
            'UPDATE users SET refresh_token_hash = ? WHERE id = ?',
            [refreshTokenHash, userId]
        );
    }

    static async update(userId, updateData) {
        const { password, ...rest } = updateData;
        const fields = [];
        const values = [];
        for (const [key, value] of Object.entries(rest)) {
            if (value !== undefined) {
                fields.push(`${key} = ?`);
                values.push(value);
            }
        }
        if (password && password.trim()) {
            const hashedPassword = await hashPassword(password);
            fields.push('password_hash = ?');
            values.push(hashedPassword);
        }
        if (fields.length === 0) return;
        values.push(userId);
        await pool.execute(
            `UPDATE users SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ?`,
            values
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
    let baseQuery = 'FROM users WHERE deleted_at IS NULL';

    const values = [];
    const countValues = [];

    // Filters
    if (filters.role) {
        baseQuery += ' AND role = ?';
        values.push(filters.role);
        countValues.push(filters.role);
    }

    if (filters.status) {
        baseQuery += ' AND status = ?';
        values.push(filters.status);
        countValues.push(filters.status);
    }

    if (filters.search) {
        baseQuery += ' AND (email LIKE ? OR phone LIKE ? OR full_name LIKE ?)';
        const searchValue = `%${filters.search}%`;
        values.push(searchValue, searchValue, searchValue);
        countValues.push(searchValue, searchValue, searchValue);
    }

    // Sorting - allowed columns to prevent SQL injection
    const allowedSortColumns = ['created_at', 'updated_at', 'full_name', 'email', 'role', 'status', 'phone', 'last_login_at'];
    const sortBy = filters.sortBy && allowedSortColumns.includes(filters.sortBy) ? filters.sortBy : 'created_at';
    const sortOrder = filters.sortOrder === 'ASC' ? 'ASC' : 'DESC';

    const dataQuery = `
        SELECT id, email, phone, full_name, role, status, profile_image, date_of_birth, address, city, state, country, postal_code,
        last_login_at, created_at 
        ${baseQuery}
        ORDER BY ${sortBy} ${sortOrder}
    `;
    const countQuery = `SELECT COUNT(*) as total ${baseQuery}`;

    // Pagination
    let page = filters.page || 1;
    let limit = filters.limit || 10;
    const offset = (page - 1) * limit;

    const paginatedQuery = dataQuery + ' LIMIT ? OFFSET ?';
    const fullValues = [...values, limit, offset];

    const [[{ total }]] = await pool.execute(countQuery, countValues);
    const [rows] = await pool.execute(paginatedQuery, fullValues);

    return { rows, total, page, limit };
}

    static async delete(userId) {
        await pool.execute(
            'UPDATE users SET deleted_at = NOW() WHERE id = ?',
            [userId]
        );
    }
}

export default User;