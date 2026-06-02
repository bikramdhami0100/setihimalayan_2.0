-- =============================================
-- MIGRATION: Add Boarding & Dropping Point Support
-- =============================================

-- =============================================
-- 1. CREATE route_points TABLE
-- =============================================
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 2. CREATE schedule_route_points TABLE
--    (Optional: for schedule-specific timing & tracking)
-- =============================================
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 3. ALTER bookings TABLE
--    Add boarding/dropping point columns
-- =============================================
ALTER TABLE `bookings`
  ADD COLUMN `boarding_point_id` INT NULL AFTER `selected_seats`,
  ADD COLUMN `dropping_point_id` INT NULL AFTER `boarding_point_id`,
  ADD COLUMN `boarding_time` DATETIME NULL AFTER `dropping_point_id`,
  ADD COLUMN `dropping_time` DATETIME NULL AFTER `boarding_time`,
  ADD INDEX `idx_boarding_point` (`boarding_point_id`),
  ADD INDEX `idx_dropping_point` (`dropping_point_id`);

ALTER TABLE `bookings`
  ADD FOREIGN KEY (`boarding_point_id`) REFERENCES `route_points`(`id`) ON DELETE SET NULL,
  ADD FOREIGN KEY (`dropping_point_id`) REFERENCES `route_points`(`id`) ON DELETE SET NULL;

-- =============================================
-- 4. REMOVE routes.stops COLUMN
--    Data is now fully normalized into route_points
-- =============================================
ALTER TABLE `routes` DROP COLUMN `stops`;

-- =============================================
-- 5. SAMPLE DATA: Route Points for Kathmandu -> Pokhara
-- =============================================

-- First, get the route ID for Kathmandu -> Pokhara (assumes route_id = 1 from sample data)
-- Origin: Kathmandu Bus Park
SET @route_id = (SELECT id FROM routes WHERE origin = 'Kathmandu' AND destination = 'Pokhara' LIMIT 1);

INSERT INTO `route_points` (`route_id`, `point_name`, `point_order`, `arrival_time`, `departure_time`, `additional_fare`, `is_boarding_point`, `is_dropping_point`, `landmark`, `notes`) VALUES
(@route_id, 'Kathmandu Bus Park',      1, NULL,          '06:00:00', 0.00,   TRUE,  FALSE, 'Gongabu Bus Park', 'Starting point. Boarding only.'),
(@route_id, 'Thankot',                2, '06:45:00',    '06:50:00', 0.00,   TRUE,  FALSE, 'Thankot Checkpoint', '15-min stop for exit check. Boarding allowed.'),
(@route_id, 'Mugling',                3, '09:00:00',    '09:20:00', 50.00,  TRUE,  TRUE,  'Mugling Bazaar', 'Break stop. Both boarding & dropping.'),
(@route_id, 'Dumre',                  4, '10:00:00',    '10:05:00', 100.00, TRUE,  TRUE,  'Dumre Chauraha', 'Short stop. Both boarding & dropping.'),
(@route_id, 'Pokhara Bus Park',       5, '12:30:00',    NULL,       0.00,   FALSE, TRUE,  'Pratindhi Marga, Pokhara', 'Terminal point. Dropping only.');

-- =============================================
-- 6. SAMPLE DATA: Schedule Route Points
--    For schedule_id = 1 (the first KTM->PKR schedule)
-- =============================================
SET @schedule_id = (SELECT id FROM schedules WHERE route_id = @route_id LIMIT 1);
SET @depart_base = (SELECT departure_time FROM schedules WHERE id = @schedule_id);

INSERT INTO `schedule_route_points` (`schedule_id`, `route_point_id`, `expected_arrival`, `expected_departure`, `status`) VALUES
(@schedule_id, (SELECT id FROM route_points WHERE route_id = @route_id AND point_order = 1), @depart_base,                                   @depart_base,                                   'departed'),
(@schedule_id, (SELECT id FROM route_points WHERE route_id = @route_id AND point_order = 2), @depart_base + INTERVAL 45 MINUTE,               @depart_base + INTERVAL 50 MINUTE,              'pending'),
(@schedule_id, (SELECT id FROM route_points WHERE route_id = @route_id AND point_order = 3), @depart_base + INTERVAL 3 HOUR,                  @depart_base + INTERVAL 3 HOUR + INTERVAL 20 MINUTE, 'pending'),
(@schedule_id, (SELECT id FROM route_points WHERE route_id = @route_id AND point_order = 4), @depart_base + INTERVAL 4 HOUR,                  @depart_base + INTERVAL 4 HOUR + INTERVAL 5 MINUTE,  'pending'),
(@schedule_id, (SELECT id FROM route_points WHERE route_id = @route_id AND point_order = 5), @depart_base + INTERVAL 6 HOUR + INTERVAL 30 MINUTE, NULL,                                       'pending');

-- =============================================
-- 7. UPDATE popular_routes VIEW to remove stops dependency
-- =============================================
CREATE OR REPLACE VIEW popular_routes AS
SELECT
    r.id as route_id,
    r.origin,
    r.route_image,
    r.popularity_score,
    r.duration_minutes,
    r.base_price,
    r.distance_km,
    r.destination,
    COUNT(b.id) as booking_count,
    SUM(b.total_amount) as total_revenue,
    AVG(b.total_amount) as average_revenue
FROM routes r
JOIN schedules s ON s.route_id = r.id
JOIN bookings b ON b.schedule_id = s.id AND b.status = 'confirmed'
GROUP BY r.id, r.origin, r.destination, r.route_image, r.popularity_score, r.duration_minutes, r.base_price, r.distance_km
ORDER BY booking_count DESC;

SELECT 'Migration completed successfully!' as Status;
