-- =============================================
-- BUS BOOKING SYSTEM DATABASE SCHEMA
-- For XAMPP MySQL (Without Redis)
-- =============================================

-- Drop database if exists and create new
DROP DATABASE IF EXISTS bus_booking_system;
CREATE DATABASE bus_booking_system;
USE bus_booking_system;

-- =============================================
-- 1. USERS TABLE
-- =============================================
CREATE TABLE `users` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `email` VARCHAR(255) UNIQUE NOT NULL,
  `phone` VARCHAR(15) UNIQUE NOT NULL,
  `full_name` VARCHAR(100) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` ENUM('passenger', 'admin', 'super_admin') DEFAULT 'passenger',
  `status` ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
  `refresh_token_hash` VARCHAR(255) NULL,
  `reset_token` VARCHAR(255) NULL,
  `reset_token_expiry` TIMESTAMP NULL,
  `is_email_verified` BOOLEAN DEFAULT FALSE,
  `email_verified_at` TIMESTAMP NULL,
  `last_login_at` TIMESTAMP NULL,
  `last_active_at` TIMESTAMP NULL,
  `profile_image` VARCHAR(500) NULL,
  `date_of_birth` DATE NULL,
  `address` TEXT NULL,
  `city` VARCHAR(100) NULL,
  `state` VARCHAR(100) NULL,
  `country` VARCHAR(100) DEFAULT 'Nepal',
  `postal_code` VARCHAR(20) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` TIMESTAMP NULL,
  
  INDEX idx_email_phone (`email`, `phone`),
  INDEX idx_role_status (`role`, `status`),
  INDEX idx_created_at (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 2. BUSES TABLE
-- =============================================
CREATE TABLE `buses` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `bus_number` VARCHAR(50) UNIQUE NOT NULL,
  `registration_number` VARCHAR(50) UNIQUE,
  `total_seats` INT NOT NULL,
  `seat_layout` JSON NOT NULL,
  `amenities` JSON,
  `bus_type` ENUM('Standard', 'Luxury', 'Sleeper', 'Mini') DEFAULT 'Standard',
  `status` ENUM('active', 'maintenance', 'retired') DEFAULT 'active',
  `manufacturer` VARCHAR(100) NULL,
  `model` VARCHAR(100) NULL,
  `year` INT NULL,
  `color` VARCHAR(50) NULL,
  `license_plate` VARCHAR(20) NULL,
  `insurance_expiry` DATE NULL,
  `fitness_expiry` DATE NULL,
  `notes` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` TIMESTAMP NULL,
  
  INDEX idx_bus_number (`bus_number`),
  INDEX idx_bus_type (`bus_type`),
  INDEX idx_status (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 3. ROUTES TABLE
-- =============================================
CREATE TABLE `routes` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `origin` VARCHAR(100) NOT NULL,
  `destination` VARCHAR(100) NOT NULL,
  `distance_km` DECIMAL(10,2),
  `duration_minutes` INT,
  `base_price` DECIMAL(10,2),
  `is_active` BOOLEAN DEFAULT TRUE,
  `stops` JSON,
  `popularity_score` INT DEFAULT 0,
  `description` TEXT,
  `route_image` VARCHAR(500),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` TIMESTAMP NULL,
  
  UNIQUE KEY unique_route (origin, destination),
  INDEX idx_origin_destination (origin, destination),
  INDEX idx_is_active (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 4. SCHEDULES TABLE
-- =============================================
CREATE TABLE `schedules` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `bus_id` INT NOT NULL,
  `route_id` INT NOT NULL,
  `departure_time` DATETIME NOT NULL,
  `arrival_time` DATETIME NOT NULL,
  `base_price` DECIMAL(10,2) NOT NULL,
  `available_seats` INT NOT NULL,
  `total_seats` INT NOT NULL,
  `status` ENUM('scheduled', 'cancelled', 'completed', 'delayed') DEFAULT 'scheduled',
  `cancellation_reason` TEXT,
  `delay_minutes` INT DEFAULT 0,
  `driver_name` VARCHAR(100),
  `driver_phone` VARCHAR(15),
  `conductor_name` VARCHAR(100),
  `conductor_phone` VARCHAR(15),
  `notes` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` TIMESTAMP NULL,
  
  FOREIGN KEY (`bus_id`) REFERENCES `buses`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`route_id`) REFERENCES `routes`(`id`) ON DELETE CASCADE,
  
  INDEX idx_departure_time (`departure_time`),
  INDEX idx_available_seats (`available_seats`),
  INDEX idx_bus_schedule (`bus_id`, `departure_time`),
  INDEX idx_route_schedule (`route_id`, `departure_time`),
  INDEX idx_status_departure (`status`, `departure_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 5. BOOKINGS TABLE
-- =============================================
CREATE TABLE `bookings` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `schedule_id` INT NOT NULL,
  `booking_reference` VARCHAR(50) UNIQUE NOT NULL,
  `selected_seats` JSON NOT NULL,
  `total_amount` DECIMAL(10,2) NOT NULL,
  `status` ENUM('pending_payment', 'payment_processing', 'confirmed', 'cancelled', 'expired', 'refunded') DEFAULT 'pending_payment',
  `payment_gateway` ENUM('esewa', 'khalti', 'connectips'),
  `payment_reference` VARCHAR(255),
  `seat_lock_expires_at` TIMESTAMP NULL,
  `confirmed_at` TIMESTAMP NULL,
  `cancelled_at` TIMESTAMP NULL,
  `cancellation_reason` TEXT,
  `refund_amount` DECIMAL(10,2),
  `refund_processed_at` TIMESTAMP NULL,
  `passenger_details` JSON NOT NULL,
  `special_requests` TEXT,
  `ticket_downloaded` BOOLEAN DEFAULT FALSE,
  `ticket_downloaded_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` TIMESTAMP NULL,
  
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`),
  FOREIGN KEY (`schedule_id`) REFERENCES `schedules`(`id`),
  
  INDEX idx_booking_reference (`booking_reference`),
  INDEX idx_status_lock_expiry (`status`, `seat_lock_expires_at`),
  INDEX idx_user_bookings (`user_id`, `created_at`),
  INDEX idx_schedule_bookings (`schedule_id`, `status`),
  INDEX idx_payment_reference (`payment_reference`),
  INDEX idx_created_at (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 6. SEAT LOCKS TABLE (Temporary Locking)
-- =============================================
CREATE TABLE `seat_locks` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `schedule_id` INT NOT NULL,
  `seat_number` VARCHAR(10) NOT NULL,
  `booking_id` INT NOT NULL,
  `locked_by` INT NOT NULL,
  `locked_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `expires_at` DATETIME NOT NULL,          -- Changed from TIMESTAMP to DATETIME
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (`schedule_id`) REFERENCES `schedules`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`locked_by`) REFERENCES `users`(`id`),
  
  UNIQUE KEY unique_schedule_seat (schedule_id, seat_number),
  INDEX idx_expiry_cleanup (`expires_at`),
  INDEX idx_booking_lock (`booking_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- =============================================
-- 7. PAYMENT TRANSACTIONS TABLE
-- =============================================
CREATE TABLE `payment_transactions` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `booking_id` INT NOT NULL,
  `gateway` ENUM('esewa', 'khalti', 'connectips') NOT NULL,
  `amount` DECIMAL(10,2) NOT NULL,
  `request_payload` JSON,
  `response_payload` JSON,
  `status` ENUM('initiated', 'pending_verification', 'success', 'failed', 'refunded', 'cancelled') DEFAULT 'initiated',
  `transaction_id` VARCHAR(255),
  `error_message` TEXT,
  `payment_url` VARCHAR(500),
  `verification_attempts` INT DEFAULT 0,
  `last_verification_at` TIMESTAMP NULL,
  `refund_transaction_id` VARCHAR(255),
  `refunded_at` TIMESTAMP NULL,
  `ip_address` VARCHAR(45),
  `user_agent` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON DELETE CASCADE,
  
  INDEX idx_booking_payment (`booking_id`),
  INDEX idx_transaction_id (`transaction_id`),
  INDEX idx_gateway_status (`gateway`, `status`),
  INDEX idx_created_at (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 8. AUDIT LOGS TABLE (For tracking)
-- =============================================
CREATE TABLE `audit_logs` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `user_id` INT NULL,
  `action` VARCHAR(100) NOT NULL,
  `entity` VARCHAR(50) NOT NULL,
  `entity_id` INT,
  `old_values` JSON,
  `new_values` JSON,
  `ip_address` VARCHAR(45),
  `user_agent` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_user_audit (`user_id`),
  INDEX idx_entity_audit (`entity`, `entity_id`),
  INDEX idx_created_at (`created_at`),
  
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- SAMPLE DATA INSERTION
-- =============================================

-- Insert Admin User (password: Admin@123)
-- Note: Use bcrypt hash in production
INSERT INTO `users` (`email`, `phone`, `full_name`, `password_hash`, `role`, `status`, `is_email_verified`) VALUES 
('admin@busbooking.com', '9800000000', 'System Administrator', '$2a$10$YourHashHere', 'super_admin', 'active', TRUE);

-- Insert Sample Buses
INSERT INTO `buses` (`bus_number`, `registration_number`, `total_seats`, `seat_layout`, `amenities`, `bus_type`, `status`) VALUES 
('BA 1 KHA 1234', 'BA1KHA1234', 40, '{"rows": 10, "columns": 4, "layout": "2x2"}', '["AC", "WiFi", "Charging Point", "TV"]', 'Luxury', 'active'),
('BA 2 KHA 5678', 'BA2KHA5678', 32, '{"rows": 8, "columns": 4, "layout": "2x2"}', '["AC", "Charging Point"]', 'Standard', 'active'),
('BA 3 KHA 9012', 'BA3KHA9012', 48, '{"rows": 12, "columns": 4, "layout": "2x2"}', '["AC", "WiFi", "Charging Point", "Snacks", "Water"]', 'Luxury', 'active'),
('BA 4 KHA 3456', 'BA4KHA3456', 20, '{"rows": 5, "columns": 4, "layout": "2x2"}', '["AC"]', 'Mini', 'active'),
('BA 5 KHA 7890', 'BA5KHA7890', 36, '{"rows": 9, "columns": 4, "layout": "2x2"}', '["AC", "WiFi", "Charging Point", "TV", "Snacks"]', 'Sleeper', 'active');

-- Insert Sample Routes
INSERT INTO `routes` (`origin`, `destination`, `distance_km`, `duration_minutes`, `base_price`, `is_active`) VALUES 
('Kathmandu', 'Pokhara', 200, 420, 1200, TRUE),
('Kathmandu', 'Chitwan', 150, 300, 1000, TRUE),
('Kathmandu', 'Lumbini', 330, 540, 1800, TRUE),
('Pokhara', 'Kathmandu', 200, 420, 1200, TRUE),
('Pokhara', 'Chitwan', 120, 240, 900, TRUE),
('Kathmandu', 'Biratnagar', 400, 720, 2200, TRUE),
('Kathmandu', 'Janakpur', 300, 540, 1700, TRUE),
('Pokhara', 'Lumbini', 150, 300, 1100, TRUE),
('Chitwan', 'Pokhara', 120, 240, 900, TRUE),
('Biratnagar', 'Kathmandu', 400, 720, 2200, TRUE);

-- Insert Sample Schedules (Next 7 days)
-- Insert Sample Schedules (Next 7 days)
INSERT INTO `schedules` (`bus_id`, `route_id`, `departure_time`, `arrival_time`, `base_price`, `available_seats`, `total_seats`, `status`) VALUES 
(1, 1, NOW() + INTERVAL 1 DAY, NOW() + INTERVAL 1 DAY + INTERVAL 7 HOUR, 1200, 40, 40, 'scheduled'),
(2, 1, NOW() + INTERVAL 1 DAY + INTERVAL 2 HOUR, NOW() + INTERVAL 1 DAY + INTERVAL 9 HOUR, 1200, 32, 32, 'scheduled'),
(3, 2, NOW() + INTERVAL 1 DAY, NOW() + INTERVAL 1 DAY + INTERVAL 5 HOUR, 1000, 48, 48, 'scheduled'),
(1, 3, NOW() + INTERVAL 2 DAY, NOW() + INTERVAL 2 DAY + INTERVAL 9 HOUR, 1800, 40, 40, 'scheduled'),
(4, 4, NOW() + INTERVAL 1 DAY, NOW() + INTERVAL 1 DAY + INTERVAL 7 HOUR, 1200, 20, 20, 'scheduled'),
(5, 5, NOW() + INTERVAL 2 DAY, NOW() + INTERVAL 2 DAY + INTERVAL 4 HOUR, 900, 36, 36, 'scheduled'),
(2, 6, NOW() + INTERVAL 3 DAY, NOW() + INTERVAL 3 DAY + INTERVAL 12 HOUR, 2200, 32, 32, 'scheduled'),
(3, 7, NOW() + INTERVAL 1 DAY + INTERVAL 4 HOUR, NOW() + INTERVAL 1 DAY + INTERVAL 13 HOUR, 1700, 48, 48, 'scheduled'),
(1, 8, NOW() + INTERVAL 2 DAY + INTERVAL 2 HOUR, NOW() + INTERVAL 2 DAY + INTERVAL 7 HOUR, 1100, 40, 40, 'scheduled'),
(4, 9, NOW() + INTERVAL 1 DAY, NOW() + INTERVAL 1 DAY + INTERVAL 4 HOUR, 900, 20, 20, 'scheduled'),
(5, 10, NOW() + INTERVAL 3 DAY, NOW() + INTERVAL 3 DAY + INTERVAL 12 HOUR, 2200, 36, 36, 'scheduled');
-- =============================================
-- STORED PROCEDURES
-- =============================================

-- Get available seats for a schedule
DELIMITER //
CREATE PROCEDURE GetAvailableSeats(IN p_schedule_id INT)
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

-- Get booking statistics
DELIMITER //
CREATE PROCEDURE GetBookingStats(IN p_start_date DATE, IN p_end_date DATE)
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

-- Cleanup expired seat locks
DELIMITER //
CREATE PROCEDURE CleanupExpiredLocks()
BEGIN
    DELETE FROM seat_locks WHERE expires_at < NOW();
    UPDATE bookings 
    SET status = 'expired' 
    WHERE status = 'pending_payment' 
    AND seat_lock_expires_at < NOW();
END //
DELIMITER ;

-- =============================================
-- TRIGGERS
-- =============================================

-- Update available seats when booking is confirmed
DELIMITER //
CREATE TRIGGER update_available_seats_on_confirm
AFTER UPDATE ON bookings
FOR EACH ROW
BEGIN
    IF NEW.status = 'confirmed' AND OLD.status != 'confirmed' THEN
        UPDATE schedules 
        SET available_seats = available_seats - JSON_LENGTH(NEW.selected_seats)
        WHERE id = NEW.schedule_id;
    END IF;
END //
DELIMITER ;

-- Restore available seats when booking is cancelled
DELIMITER //
CREATE TRIGGER restore_available_seats_on_cancel
AFTER UPDATE ON bookings
FOR EACH ROW
BEGIN
    IF NEW.status = 'cancelled' AND OLD.status = 'confirmed' THEN
        UPDATE schedules 
        SET available_seats = available_seats + JSON_LENGTH(NEW.selected_seats)
        WHERE id = NEW.schedule_id;
    END IF;
END //
DELIMITER ;

-- Audit log for user changes
DELIMITER //
CREATE TRIGGER audit_user_update
AFTER UPDATE ON users
FOR EACH ROW
BEGIN
    INSERT INTO audit_logs (user_id, action, entity, entity_id, old_values, new_values)
    VALUES (NEW.id, 'UPDATE', 'user', NEW.id, 
            JSON_OBJECT('email', OLD.email, 'phone', OLD.phone, 'status', OLD.status),
            JSON_OBJECT('email', NEW.email, 'phone', NEW.phone, 'status', NEW.status));
END //
DELIMITER ;

-- =============================================
-- VIEWS
-- =============================================

-- View for daily revenue report
CREATE VIEW daily_revenue_report AS
SELECT 
    DATE(b.created_at) as date,
    COUNT(b.id) as total_bookings,
    SUM(b.total_amount) as total_revenue,
    AVG(b.total_amount) as average_ticket_price,
    COUNT(CASE WHEN b.status = 'confirmed' THEN 1 END) as confirmed_bookings,
    COUNT(CASE WHEN b.status = 'cancelled' THEN 1 END) as cancelled_bookings
FROM bookings b
GROUP BY DATE(b.created_at);

-- View for popular routes
CREATE VIEW popular_routes AS
SELECT 
    r.id as route_id,
    r.origin,
    r.destination,
    COUNT(b.id) as booking_count,
    SUM(b.total_amount) as total_revenue,
    AVG(b.total_amount) as average_revenue
FROM routes r
JOIN schedules s ON s.route_id = r.id
JOIN bookings b ON b.schedule_id = s.id AND b.status = 'confirmed'
GROUP BY r.id, r.origin, r.destination
ORDER BY booking_count DESC;

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Additional indexes for better query performance
CREATE INDEX idx_bookings_user_status ON bookings(user_id, status);
CREATE INDEX idx_bookings_schedule_status ON bookings(schedule_id, status);
CREATE INDEX idx_schedules_route_date ON schedules(route_id, departure_time);
CREATE INDEX idx_schedules_bus_date ON schedules(bus_id, departure_time);
CREATE INDEX idx_seat_locks_schedule_expiry ON seat_locks(schedule_id, expires_at);
CREATE INDEX idx_payment_transactions_booking ON payment_transactions(booking_id, status);

-- =============================================
-- MAINTENANCE COMMANDS
-- =============================================

-- Analyze tables for better query optimization
ANALYZE TABLE users;
ANALYZE TABLE buses;
ANALYZE TABLE routes;
ANALYZE TABLE schedules;
ANALYZE TABLE bookings;
ANALYZE TABLE seat_locks;
ANALYZE TABLE payment_transactions;

-- Optimize tables
OPTIMIZE TABLE users;
OPTIMIZE TABLE buses;
OPTIMIZE TABLE routes;
OPTIMIZE TABLE schedules;
OPTIMIZE TABLE bookings;
OPTIMIZE TABLE seat_locks;
OPTIMIZE TABLE payment_transactions;

-- =============================================
-- QUERY EXAMPLES
-- =============================================

-- Example: Search available buses
-- SELECT s.*, b.bus_number, b.bus_type, r.origin, r.destination
-- FROM schedules s
-- JOIN buses b ON b.id = s.bus_id
-- JOIN routes r ON r.id = s.route_id
-- WHERE r.origin = 'Kathmandu' 
--   AND r.destination = 'Pokhara'
--   AND DATE(s.departure_time) = CURDATE()
--   AND s.status = 'scheduled'
--   AND s.available_seats > 0;

-- Example: Get user booking history
-- SELECT b.*, s.departure_time, r.origin, r.destination
-- FROM bookings b
-- JOIN schedules s ON s.id = b.schedule_id
-- JOIN routes r ON r.id = s.route_id
-- WHERE b.user_id = 1
-- ORDER BY b.created_at DESC;

-- Example: Get revenue report for last 30 days
-- SELECT * FROM daily_revenue_report 
-- WHERE date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
-- ORDER BY date DESC;

SELECT 'Database setup completed successfully!' as Status;