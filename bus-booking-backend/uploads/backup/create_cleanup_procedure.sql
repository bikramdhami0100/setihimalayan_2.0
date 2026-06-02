-- Create missing CleanupExpiredLocks stored procedure

USE bus_booking_system;

DELIMITER //
CREATE PROCEDURE IF NOT EXISTS CleanupExpiredLocks()
BEGIN
    DELETE FROM seat_locks WHERE expires_at < NOW();
    UPDATE bookings 
    SET status = 'expired' 
    WHERE status = 'pending_payment' 
    AND seat_lock_expires_at < NOW();
END //
DELIMITER ;
