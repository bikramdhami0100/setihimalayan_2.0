import pool from '../config/database.js';

class SeatLock {
    static async createLock(scheduleId, seatNumber, bookingId, userId, expiresAt) {
        await pool.execute(
            `INSERT INTO seat_locks (schedule_id, seat_number, booking_id, locked_by, expires_at)
             VALUES (?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
             locked_by = VALUES(locked_by),
             expires_at = VALUES(expires_at),
             updated_at = NOW()`,
            [scheduleId, seatNumber, bookingId, userId, expiresAt]
        );
    }

    static async getLockedSeats(scheduleId) {
        const [rows] = await pool.execute(
            `SELECT seat_number FROM seat_locks
             WHERE schedule_id = ? AND expires_at > NOW()`,
            [scheduleId]
        );
        return rows.map(row => row.seat_number);
    }

    static async getLockedSeatsWithDetails(scheduleId) {
        const [rows] = await pool.execute(
            `SELECT sl.seat_number, sl.expires_at, u.full_name as locked_by_name
             FROM seat_locks sl
             JOIN users u ON u.id = sl.locked_by
             WHERE sl.schedule_id = ? AND sl.expires_at > NOW()`,
            [scheduleId]
        );
        return rows;
    }

    static async releaseLock(scheduleId, seatNumber) {
        await pool.execute(
            'DELETE FROM seat_locks WHERE schedule_id = ? AND seat_number = ?',
            [scheduleId, seatNumber]
        );
    }

    static async releaseAllByBooking(bookingId) {
        await pool.execute(
            'DELETE FROM seat_locks WHERE booking_id = ?',
            [bookingId]
        );
    }

    static async releaseAllExpired() {
        await pool.execute('DELETE FROM seat_locks WHERE expires_at < NOW()');
    }

    static async isSeatLocked(scheduleId, seatNumber) {
        const [rows] = await pool.execute(
            `SELECT 1 FROM seat_locks
             WHERE schedule_id = ? AND seat_number = ? AND expires_at > NOW()`,
            [scheduleId, seatNumber]
        );
        return rows.length > 0;
    }
}

export default SeatLock;