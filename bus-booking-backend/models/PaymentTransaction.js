import pool from '../config/database.js';

class PaymentTransaction {
    static async create(transactionData) {
        const {
            booking_id, gateway, amount, request_payload,
            ip_address, user_agent
        } = transactionData;

        const [result] = await pool.execute(
            `INSERT INTO payment_transactions (
                booking_id, gateway, amount, request_payload,
                ip_address, user_agent, status
            ) VALUES (?, ?, ?, ?, ?, ?, 'initiated')`,
            [
                booking_id, gateway, amount,
                request_payload ? JSON.stringify(request_payload) : null,
                ip_address, user_agent
            ]
        );
        return result.insertId;
    }

    static async updateStatus(id, status, updateData = {}) {
        const fields = ['status = ?'];
        const values = [status];

        if (updateData.response_payload) {
            fields.push('response_payload = ?');
            values.push(JSON.stringify(updateData.response_payload));
        }
        if (updateData.transaction_id) {
            fields.push('transaction_id = ?');
            values.push(updateData.transaction_id);
        }
        if (updateData.error_message) {
            fields.push('error_message = ?');
            values.push(updateData.error_message);
        }
        if (updateData.payment_url) {
            fields.push('payment_url = ?');
            values.push(updateData.payment_url);
        }
        if (status === 'success') {
            // No extra field, but you could add verification data
        }
        values.push(id);
        await pool.execute(
            `UPDATE payment_transactions SET ${fields.join(', ')}, updated_at = NOW()
             WHERE id = ?`,
            values
        );
        return this.findById(id);
    }

    static async findByBookingId(bookingId) {
        const [rows] = await pool.execute(
            `SELECT * FROM payment_transactions
             WHERE booking_id = ?
             ORDER BY id DESC LIMIT 1`,
            [bookingId]
        );
        return rows[0];
    }

    static async findById(id) {
        const [rows] = await pool.execute(
            'SELECT * FROM payment_transactions WHERE id = ?',
            [id]
        );
        return rows[0];
    }

    static async findByTransactionId(transactionId) {
        const [rows] = await pool.execute(
            'SELECT * FROM payment_transactions WHERE transaction_id = ?',
            [transactionId]
        );
        return rows[0];
    }

    static async updateVerificationAttempt(id) {
        await pool.execute(
            `UPDATE payment_transactions
             SET verification_attempts = verification_attempts + 1,
                 last_verification_at = NOW()
             WHERE id = ?`,
            [id]
        );
    }

    static async markRefunded(id, refundTransactionId) {
        await pool.execute(
            `UPDATE payment_transactions
             SET status = 'refunded', refund_transaction_id = ?, refunded_at = NOW()
             WHERE id = ?`,
            [refundTransactionId, id]
        );
    }
}

export default PaymentTransaction;