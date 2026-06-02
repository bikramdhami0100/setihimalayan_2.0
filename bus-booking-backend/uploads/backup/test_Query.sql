-- Check all tables
SHOW TABLES;

-- Check users
SELECT * FROM users;

-- Check buses
SELECT * FROM buses;

-- Check routes
SELECT * FROM routes;

-- Check schedules
SELECT s.*, b.bus_number, r.origin, r.destination 
FROM schedules s
JOIN buses b ON b.id = s.bus_id
JOIN routes r ON r.id = s.route_id;

-- Check available seats for tomorrow
SELECT s.*, r.origin, r.destination, b.bus_number
FROM schedules s
JOIN routes r ON r.id = s.route_id
JOIN buses b ON b.id = s.bus_id
WHERE DATE(s.departure_time) = DATE_ADD(CURDATE(), INTERVAL 1 DAY)
AND s.available_seats > 0;

-- Clean up expired locks (run daily)
CALL CleanupExpiredLocks();

-- Get popular routes
SELECT * FROM popular_routes LIMIT 5;

-- Get revenue report
SELECT * FROM daily_revenue_report 
WHERE date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY);




-- Check table sizes
SELECT 
    table_name,
    ROUND(((data_length + index_length) / 1024 / 1024), 2) AS size_mb
FROM information_schema.tables
WHERE table_schema = 'bus_booking_system'
ORDER BY size_mb DESC;

-- Check for slow queries
SHOW VARIABLES LIKE 'slow_query_log';

-- Backup database
-- mysqldump -u root -p bus_booking_system > backup.sql

-- Restore database
-- mysql -u root -p bus_booking_system < backup.sql