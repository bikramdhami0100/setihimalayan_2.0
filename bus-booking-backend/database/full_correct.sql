DROP DATABASE IF EXISTS bus_booking_system;
CREATE DATABASE bus_booking_system;
USE bus_booking_system;

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
  `notification_preferences` JSON NULL DEFAULT NULL,
  `language` VARCHAR(10) DEFAULT 'en',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` TIMESTAMP NULL,
  
  INDEX idx_email_phone (`email`, `phone`),
  INDEX idx_role_status (`role`, `status`),
  INDEX idx_created_at (`created_at`)
);

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
);

CREATE TABLE `routes` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `origin` VARCHAR(100) NOT NULL,
  `destination` VARCHAR(100) NOT NULL,
  `distance_km` DECIMAL(10,2),
  `duration_minutes` INT,
  `base_price` DECIMAL(10,2),
  `is_active` BOOLEAN DEFAULT TRUE,
  `popularity_score` INT DEFAULT 0,
  `description` TEXT,
  `route_image` VARCHAR(500),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` TIMESTAMP NULL,
  
  UNIQUE KEY unique_route (origin, destination),
  INDEX idx_origin_destination (origin, destination),
  INDEX idx_is_active (`is_active`)
);

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
);

CREATE TABLE `route_points` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `route_id` INT NOT NULL,
  `point_name` VARCHAR(150) NOT NULL,
  `point_order` INT NOT NULL,
  `arrival_time` TIME NULL,
  `departure_time` TIME NULL,
  `additional_fare` DECIMAL(10,2) DEFAULT 0.00,
  `is_boarding_point` BOOLEAN DEFAULT TRUE,
  `is_dropping_point` BOOLEAN DEFAULT TRUE,
  `landmark` VARCHAR(255) NULL,
  `notes` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (`route_id`) REFERENCES `routes`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `unique_route_point_order` (`route_id`, `point_order`),
  INDEX `idx_route_points_order` (`route_id`, `point_order`),
  INDEX `idx_boarding` (`route_id`, `is_boarding_point`),
  INDEX `idx_dropping` (`route_id`, `is_dropping_point`)
);

CREATE TABLE `schedule_route_points` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `schedule_id` INT NOT NULL,
  `route_point_id` INT NOT NULL,
  `expected_arrival` DATETIME NULL,
  `expected_departure` DATETIME NULL,
  `actual_arrival` DATETIME NULL,
  `actual_departure` DATETIME NULL,
  `status` ENUM('pending', 'reached', 'departed', 'skipped') DEFAULT 'pending',
  `delay_minutes` INT DEFAULT 0,
  `notes` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (`schedule_id`) REFERENCES `schedules`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`route_point_id`) REFERENCES `route_points`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `unique_schedule_point` (`schedule_id`, `route_point_id`),
  INDEX `idx_srp_schedule` (`schedule_id`),
  INDEX `idx_srp_point` (`route_point_id`),
  INDEX `idx_srp_status` (`status`)
);

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
  `payment_method` VARCHAR(50) NULL DEFAULT 'cash',
  `payment_status` VARCHAR(50) NULL DEFAULT 'unpaid',
  `fare` DECIMAL(10,2) NULL,
  `discount` DECIMAL(10,2) DEFAULT 0.00,
  `notes` TEXT NULL,
  `seat_numbers` TEXT NULL,
  `passenger_name` VARCHAR(150) NULL,
  `passenger_phone` VARCHAR(20) NULL,
  `boarding_point_id` INT NULL,
  `dropping_point_id` INT NULL,
  `boarding_time` DATETIME NULL,
  `dropping_time` DATETIME NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` TIMESTAMP NULL,
  
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`),
  FOREIGN KEY (`schedule_id`) REFERENCES `schedules`(`id`),
  FOREIGN KEY (`boarding_point_id`) REFERENCES `route_points`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`dropping_point_id`) REFERENCES `route_points`(`id`) ON DELETE SET NULL,
  
  INDEX idx_booking_reference (`booking_reference`),
  INDEX idx_status_lock_expiry (`status`, `seat_lock_expires_at`),
  INDEX idx_user_bookings (`user_id`, `created_at`),
  INDEX idx_schedule_bookings (`schedule_id`, `status`),
  INDEX idx_payment_reference (`payment_reference`),
  INDEX idx_created_at (`created_at`),
  INDEX idx_boarding_point (`boarding_point_id`),
  INDEX idx_dropping_point (`dropping_point_id`)
);

CREATE TABLE `seat_locks` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `schedule_id` INT NOT NULL,
  `seat_number` VARCHAR(10) NOT NULL,
  `booking_id` INT NOT NULL,
  `locked_by` INT NOT NULL,
  `locked_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `expires_at` DATETIME NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (`schedule_id`) REFERENCES `schedules`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`locked_by`) REFERENCES `users`(`id`),
  UNIQUE KEY unique_schedule_seat (schedule_id, seat_number),
  INDEX idx_expiry_cleanup (`expires_at`),
  INDEX idx_booking_lock (`booking_id`)
);

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
);

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
);

INSERT INTO `users` (`email`, `phone`, `full_name`, `password_hash`, `role`, `status`, `is_email_verified`, `notification_preferences`, `language`) VALUES 
('admin@busbooking.com', '9800000000', 'System Administrator', '$2a$10$YourHashHere', 'super_admin', 'active', TRUE, NULL, 'en'),
('passenger@example.com', '9812345678', 'Test Passenger', '$2a$10$YourHashHere', 'passenger', 'active', TRUE, NULL, 'en');

INSERT INTO `buses` (`bus_number`, `registration_number`, `total_seats`, `seat_layout`, `amenities`, `bus_type`, `status`) VALUES 
('BA 1 KHA 1234', 'BA1KHA1234', 40, '{"rows": 10, "columns": 4, "layout": "2x2"}', '["AC", "WiFi", "Charging Point", "TV"]', 'Luxury', 'active'),
('BA 2 KHA 5678', 'BA2KHA5678', 32, '{"rows": 8, "columns": 4, "layout": "2x2"}', '["AC", "Charging Point"]', 'Standard', 'active'),
('BA 3 KHA 9012', 'BA3KHA9012', 48, '{"rows": 12, "columns": 4, "layout": "2x2"}', '["AC", "WiFi", "Charging Point", "Snacks", "Water"]', 'Luxury', 'active'),
('BA 4 KHA 3456', 'BA4KHA3456', 20, '{"rows": 5, "columns": 4, "layout": "2x2"}', '["AC"]', 'Mini', 'active'),
('BA 5 KHA 7890', 'BA5KHA7890', 36, '{"rows": 9, "columns": 4, "layout": "2x2"}', '["AC", "WiFi", "Charging Point", "TV", "Snacks"]', 'Sleeper', 'active');

INSERT INTO `routes` (`origin`, `destination`, `distance_km`, `duration_minutes`, `base_price`, `is_active`, `popularity_score`, `route_image`) VALUES 
('Kathmandu', 'Pokhara', 200, 420, 1200, TRUE, 95, '/images/routes/kathmandu-pokhara.jpg'),
('Kathmandu', 'Chitwan', 150, 300, 1000, TRUE, 85, '/images/routes/kathmandu-chitwan.jpg'),
('Kathmandu', 'Lumbini', 330, 540, 1800, TRUE, 70, '/images/routes/kathmandu-lumbini.jpg'),
('Pokhara', 'Kathmandu', 200, 420, 1200, TRUE, 90, '/images/routes/pokhara-kathmandu.jpg'),
('Pokhara', 'Chitwan', 120, 240, 900, TRUE, 75, '/images/routes/pokhara-chitwan.jpg'),
('Kathmandu', 'Biratnagar', 400, 720, 2200, TRUE, 65, '/images/routes/kathmandu-biratnagar.jpg'),
('Kathmandu', 'Janakpur', 300, 540, 1700, TRUE, 60, '/images/routes/kathmandu-janakpur.jpg'),
('Pokhara', 'Lumbini', 150, 300, 1100, TRUE, 55, '/images/routes/pokhara-lumbini.jpg'),
('Chitwan', 'Pokhara', 120, 240, 900, TRUE, 70, '/images/routes/chitwan-pokhara.jpg'),
('Biratnagar', 'Kathmandu', 400, 720, 2200, TRUE, 50, '/images/routes/biratnagar-kathmandu.jpg');

INSERT INTO `schedules` (`bus_id`, `route_id`, `departure_time`, `arrival_time`, `base_price`, `available_seats`, `total_seats`, `status`) VALUES 
(1, 1, DATE_ADD(NOW(), INTERVAL 1 DAY), DATE_ADD(DATE_ADD(NOW(), INTERVAL 1 DAY), INTERVAL 7 HOUR), 1200, 40, 40, 'scheduled'),
(2, 1, DATE_ADD(DATE_ADD(NOW(), INTERVAL 1 DAY), INTERVAL 2 HOUR), DATE_ADD(DATE_ADD(NOW(), INTERVAL 1 DAY), INTERVAL 9 HOUR), 1200, 32, 32, 'scheduled'),
(3, 2, DATE_ADD(NOW(), INTERVAL 1 DAY), DATE_ADD(DATE_ADD(NOW(), INTERVAL 1 DAY), INTERVAL 5 HOUR), 1000, 48, 48, 'scheduled'),
(1, 3, DATE_ADD(NOW(), INTERVAL 2 DAY), DATE_ADD(DATE_ADD(NOW(), INTERVAL 2 DAY), INTERVAL 9 HOUR), 1800, 40, 40, 'scheduled'),
(4, 4, DATE_ADD(NOW(), INTERVAL 1 DAY), DATE_ADD(DATE_ADD(NOW(), INTERVAL 1 DAY), INTERVAL 7 HOUR), 1200, 20, 20, 'scheduled'),
(5, 5, DATE_ADD(NOW(), INTERVAL 2 DAY), DATE_ADD(DATE_ADD(NOW(), INTERVAL 2 DAY), INTERVAL 4 HOUR), 900, 36, 36, 'scheduled'),
(2, 6, DATE_ADD(NOW(), INTERVAL 3 DAY), DATE_ADD(DATE_ADD(NOW(), INTERVAL 3 DAY), INTERVAL 12 HOUR), 2200, 32, 32, 'scheduled'),
(3, 7, DATE_ADD(DATE_ADD(NOW(), INTERVAL 1 DAY), INTERVAL 4 HOUR), DATE_ADD(DATE_ADD(NOW(), INTERVAL 1 DAY), INTERVAL 13 HOUR), 1700, 48, 48, 'scheduled'),
(1, 8, DATE_ADD(DATE_ADD(NOW(), INTERVAL 2 DAY), INTERVAL 2 HOUR), DATE_ADD(DATE_ADD(NOW(), INTERVAL 2 DAY), INTERVAL 7 HOUR), 1100, 40, 40, 'scheduled'),
(4, 9, DATE_ADD(NOW(), INTERVAL 1 DAY), DATE_ADD(DATE_ADD(NOW(), INTERVAL 1 DAY), INTERVAL 4 HOUR), 900, 20, 20, 'scheduled'),
(5, 10, DATE_ADD(NOW(), INTERVAL 3 DAY), DATE_ADD(DATE_ADD(NOW(), INTERVAL 3 DAY), INTERVAL 12 HOUR), 2200, 36, 36, 'scheduled'),
(1, 1, NOW(), DATE_ADD(NOW(), INTERVAL 7 HOUR), 1200, 38, 40, 'scheduled'),
(2, 1, NOW(), DATE_ADD(NOW(), INTERVAL 8 HOUR), 1200, 30, 32, 'scheduled'),
(3, 2, NOW(), DATE_ADD(NOW(), INTERVAL 5 HOUR), 1000, 45, 48, 'scheduled'),
(5, 5, DATE_ADD(NOW(), INTERVAL 1 DAY), DATE_ADD(DATE_ADD(NOW(), INTERVAL 1 DAY), INTERVAL 4 HOUR), 900, 36, 36, 'scheduled');

INSERT INTO `route_points` (`route_id`, `point_name`, `point_order`, `arrival_time`, `departure_time`, `additional_fare`, `is_boarding_point`, `is_dropping_point`, `landmark`, `notes`) VALUES 
(1, 'Kathmandu Bus Park', 1, NULL, '06:00:00', 0.00, TRUE, FALSE, 'Gongabu Bus Park', 'Starting point. Boarding only.'),
(1, 'Thankot', 2, '06:45:00', '06:50:00', 0.00, TRUE, FALSE, 'Thankot Checkpoint', '15-min stop for exit check. Boarding allowed.'),
(1, 'Mugling', 3, '09:00:00', '09:20:00', 50.00, TRUE, TRUE, 'Mugling Bazaar', 'Break stop. Both boarding & dropping.'),
(1, 'Dumre', 4, '10:00:00', '10:05:00', 100.00, TRUE, TRUE, 'Dumre Chauraha', 'Short stop. Both boarding & dropping.'),
(1, 'Pokhara Bus Park', 5, '12:30:00', NULL, 0.00, FALSE, TRUE, 'Pratindhi Marga, Pokhara', 'Terminal point. Dropping only.');

INSERT INTO `route_points` (`route_id`, `point_name`, `point_order`, `arrival_time`, `departure_time`, `additional_fare`, `is_boarding_point`, `is_dropping_point`, `landmark`, `notes`) VALUES 
(2, 'Kathmandu Bus Park', 1, NULL, '07:00:00', 0.00, TRUE, FALSE, 'Gongabu Bus Park', 'Starting point. Boarding only.'),
(2, 'Thankot', 2, '07:45:00', '07:50:00', 0.00, TRUE, FALSE, 'Thankot Checkpoint', 'Brief stop.'),
(2, 'Sauraha Chok', 3, '11:00:00', '11:15:00', 0.00, TRUE, TRUE, 'Sauraha Road', 'Main dropping point.'),
(2, 'Bharatpur Bus Park', 4, '11:30:00', NULL, 0.00, FALSE, TRUE, 'Bharatpur', 'Terminal point.');

INSERT INTO `bookings` (`user_id`, `schedule_id`, `booking_reference`, `selected_seats`, `total_amount`, `status`, `payment_gateway`, `payment_reference`, `seat_lock_expires_at`, `confirmed_at`, `cancelled_at`, `cancellation_reason`, `refund_amount`, `refund_processed_at`, `passenger_details`, `special_requests`, `ticket_downloaded`, `ticket_downloaded_at`, `payment_method`, `payment_status`, `fare`, `discount`, `passenger_name`, `passenger_phone`) VALUES
(2, 1, 'BK2001', '["A1","A2"]', 2400.00, 'confirmed', 'esewa', 'TXN001', DATE_ADD(NOW(), INTERVAL 10 MINUTE), NOW(), NULL, NULL, NULL, NULL, '{"passengers":[{"name":"John Doe","age":30,"gender":"M"}]}', 'Window seat', TRUE, NOW(), 'esewa', 'paid', 2400.00, 0.00, 'John Doe', '9800000001'),
(2, 2, 'BK2002', '["B1"]', 1200.00, 'pending_payment', 'khalti', NULL, DATE_ADD(NOW(), INTERVAL 15 MINUTE), NULL, NULL, NULL, NULL, NULL, '{"passengers":[{"name":"Jane Smith","age":25,"gender":"F"}]}', NULL, FALSE, NULL, 'khalti', 'unpaid', 1200.00, 0.00, 'Jane Smith', '9800000002'),
(2, 3, 'BK2003', '["C1","C2"]', 2000.00, 'confirmed', 'connectips', 'TXN003', DATE_ADD(NOW(), INTERVAL 5 MINUTE), NOW(), NULL, NULL, NULL, NULL, '{"passengers":[{"name":"Bob Johnson","age":28,"gender":"M"}]}', NULL, TRUE, NOW(), 'connectips', 'paid', 2000.00, 0.00, 'Bob Johnson', '9800000003'),
(2, 4, 'BK2004', '["D1"]', 1800.00, 'cancelled', 'esewa', 'TXN004', NOW(), NULL, NOW(), 'Personal reason', 1800.00, NOW(), '{"passengers":[{"name":"Alice Brown","age":35,"gender":"F"}]}', NULL, FALSE, NULL, 'esewa', 'refunded', 1800.00, 0.00, 'Alice Brown', '9800000004'),
(2, 5, 'BK2005', '["E1","E2"]', 2700.00, 'expired', 'khalti', NULL, DATE_SUB(NOW(), INTERVAL 1 HOUR), NULL, NULL, NULL, NULL, NULL, '{"passengers":[{"name":"Charlie Wilson","age":32,"gender":"M"}]}', NULL, FALSE, NULL, 'khalti', 'unpaid', 2700.00, 0.00, 'Charlie Wilson', '9800000005'),
(2, 6, 'BK2006', '["F1"]', 900.00, 'payment_processing', 'esewa', 'TXN006', DATE_ADD(NOW(), INTERVAL 20 MINUTE), NULL, NULL, NULL, NULL, NULL, '{"passengers":[{"name":"Diana Miller","age":29,"gender":"F"}]}', NULL, FALSE, NULL, 'esewa', 'pending', 900.00, 0.00, 'Diana Miller', '9800000006'),
(2, 7, 'BK2007', '["A3","A4"]', 2400.00, 'confirmed', 'esewa', 'TXN007', DATE_ADD(NOW(), INTERVAL 10 MINUTE), NOW(), NULL, NULL, NULL, NULL, '{"passengers":[{"name":"Ram Sharma","age":28,"gender":"M"}]}', NULL, TRUE, NOW(), 'esewa', 'paid', 2400.00, 0.00, 'Ram Sharma', '9800000007'),
(2, 8, 'BK2008', '["B2","B3"]', 2400.00, 'pending_payment', 'khalti', NULL, DATE_ADD(NOW(), INTERVAL 15 MINUTE), NULL, NULL, NULL, NULL, NULL, '{"passengers":[{"name":"Sita Gurung","age":26,"gender":"F"}]}', NULL, FALSE, NULL, 'khalti', 'unpaid', 2400.00, 0.00, 'Sita Gurung', '9800000008'),
(2, 9, 'BK2009', '["C3"]', 1000.00, 'confirmed', 'connectips', 'TXN009', DATE_ADD(NOW(), INTERVAL 5 MINUTE), NOW(), NULL, NULL, NULL, NULL, '{"passengers":[{"name":"Hari Rai","age":35,"gender":"M"}]}', NULL, TRUE, NOW(), 'connectips', 'paid', 1000.00, 0.00, 'Hari Rai', '9800000009'),
(2, 10, 'BK2010', '["F2","F3"]', 1800.00, 'confirmed', 'esewa', 'TXN010', DATE_ADD(NOW(), INTERVAL 10 MINUTE), NOW(), NULL, NULL, NULL, NULL, '{"passengers":[{"name":"Gita Karki","age":32,"gender":"F"}]}', NULL, TRUE, NOW(), 'esewa', 'paid', 1800.00, 0.00, 'Gita Karki', '9800000010');

CREATE INDEX idx_bookings_user_status ON bookings(user_id, status);
CREATE INDEX idx_schedules_route_date ON schedules(route_id, departure_time);
CREATE INDEX idx_schedules_bus_date ON schedules(bus_id, departure_time);
CREATE INDEX idx_seat_locks_schedule_expiry ON seat_locks(schedule_id, expires_at);
CREATE INDEX idx_payment_transactions_booking ON payment_transactions(booking_id, status);
CREATE INDEX idx_bookings_passenger_phone ON bookings(passenger_phone);
CREATE INDEX idx_bookings_boarding_dropping ON bookings(boarding_point_id, dropping_point_id);

ANALYZE TABLE users;
ANALYZE TABLE buses;
ANALYZE TABLE routes;
ANALYZE TABLE route_points;
ANALYZE TABLE schedule_route_points;
ANALYZE TABLE schedules;
ANALYZE TABLE bookings;
ANALYZE TABLE seat_locks;
ANALYZE TABLE payment_transactions;
ANALYZE TABLE audit_logs;

OPTIMIZE TABLE users;
OPTIMIZE TABLE buses;
OPTIMIZE TABLE routes;
OPTIMIZE TABLE route_points;
OPTIMIZE TABLE schedule_route_points;
OPTIMIZE TABLE schedules;
OPTIMIZE TABLE bookings;
OPTIMIZE TABLE seat_locks;
OPTIMIZE TABLE payment_transactions;
OPTIMIZE TABLE audit_logs;

CREATE VIEW daily_revenue_report AS
SELECT 
    DATE(b.created_at) as date,
    COUNT(b.id) as total_bookings,
    COALESCE(SUM(b.total_amount), 0) as total_revenue,
    COALESCE(AVG(b.total_amount), 0) as average_ticket_price,
    COUNT(CASE WHEN b.status = 'confirmed' THEN 1 END) as confirmed_bookings,
    COUNT(CASE WHEN b.status = 'cancelled' THEN 1 END) as cancelled_bookings,
    COUNT(CASE WHEN b.status = 'pending_payment' THEN 1 END) as pending_bookings
FROM bookings b
GROUP BY DATE(b.created_at);

CREATE VIEW popular_routes AS
SELECT 
    r.id as route_id,
    r.origin,
    r.destination,
    r.route_image,
    r.popularity_score,
    r.duration_minutes,
    r.base_price,
    r.distance_km,
    COUNT(DISTINCT b.id) as booking_count,
    COALESCE(SUM(b.total_amount), 0) as total_revenue,
    COALESCE(AVG(b.total_amount), 0) as average_revenue
FROM routes r
JOIN schedules s ON s.route_id = r.id
JOIN bookings b ON b.schedule_id = s.id AND b.status = 'confirmed'
GROUP BY r.id, r.origin, r.destination, r.route_image, r.popularity_score, r.duration_minutes, r.base_price, r.distance_km
ORDER BY booking_count DESC;