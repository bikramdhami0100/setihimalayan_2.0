import pool from '../config/database.js';
import logger from '../utils/logger.js';

/**
 * Execute the stored procedure to clean expired seat locks
 * and update expired bookings from pending_payment to expired.
 */
export const cleanupExpiredLocks = async () => {
    try {
        await pool.execute('CALL CleanupExpiredLocks()');
        logger.debug('Expired locks cleanup executed');
    } catch (err) {
        logger.error(`Cleanup error: ${err.message}`);
    }
};

/**
 * Alternative: Manually clean expired locks without stored procedure
 * (in case the procedure is missing)
 */
export const manualCleanup = async () => {
    try {
        // Delete expired seat locks
        const [lockResult] = await pool.execute('DELETE FROM seat_locks WHERE expires_at < NOW()');
        // Update expired bookings
        const [bookingResult] = await pool.execute(
            `UPDATE bookings SET status = 'expired' 
             WHERE status = 'pending_payment' AND seat_lock_expires_at < NOW()`
        );
        if (lockResult.affectedRows > 0 || bookingResult.affectedRows > 0) {
            logger.info(`Cleaned ${lockResult.affectedRows} locks, ${bookingResult.affectedRows} expired bookings`);
        }
    } catch (err) {
        logger.error(`Manual cleanup error: ${err.message}`);
    }
};

/**
 * Start the periodic cleanup job (runs every minute)
 * @param {boolean} useStoredProcedure - Whether to use stored procedure (default true)
 */
export const startCleanupJob = (useStoredProcedure = true) => {
    const cleanupFn = useStoredProcedure ? cleanupExpiredLocks : manualCleanup;
    // Run immediately on start
    cleanupFn();
    // Then schedule every 60 seconds
    setInterval(cleanupFn, 60 * 1000);
    logger.info('Cleanup job started (interval: 60 seconds)');
};