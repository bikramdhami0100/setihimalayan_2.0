-- Create all missing views and stored procedures

USE bus_booking_system;

-- View for daily revenue report
CREATE OR REPLACE VIEW daily_revenue_report AS
SELECT 
    DATE(b.created_at) as date,
    COUNT(b.id) as total_bookings,
    SUM(b.total_amount) as total_revenue,
    AVG(b.total_amount) as average_ticket_price,
    COUNT(CASE WHEN b.status = 'confirmed' THEN 1 END) as confirmed_bookings,
    COUNT(CASE WHEN b.status = 'cancelled' THEN 1 END) as cancelled_bookings
FROM bookings b
GROUP BY DATE(b.created_at);

-- Get booking statistics stored procedure
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS GetBookingStats(IN p_start_date DATE, IN p_end_date DATE)
BEGIN
    SELECT 
        DATE(created_at) as date,
        COUNT(*) as total_bookings,
        SUM(total_amount) as total_revenue,
        COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed_bookings,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_bookings
    FROM bookings
    WHERE DATE(created_at) BETWEEN p_start_date AND p_end_date
    GROUP BY DATE(created_at)
    ORDER BY date DESC;
END //
DELIMITER ;

-- Get available seats procedure
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS GetAvailableSeats(IN p_schedule_id INT)
BEGIN
    SELECT 
        s.total_seats,
        s.available_seats,
        COUNT(DISTINCT b.id) as booked_count,
        COUNT(DISTINCT sl.id) as locked_count
    FROM schedules s
    LEFT JOIN bookings b ON b.schedule_id = s.id AND b.status = 'confirmed'
    LEFT JOIN seat_locks sl ON sl.schedule_id = s.id AND sl.expires_at > NOW()
    WHERE s.id = p_schedule_id
    GROUP BY s.id;
END //
DELIMITER ;
