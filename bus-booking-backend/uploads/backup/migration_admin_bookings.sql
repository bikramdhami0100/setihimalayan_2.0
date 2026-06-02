-- =============================================
-- MIGRATION: Add admin booking management columns
-- =============================================

-- Add missing columns to bookings table for admin CRUD
ALTER TABLE `bookings`
  ADD COLUMN `payment_method` VARCHAR(50) NULL DEFAULT 'cash' AFTER `payment_gateway`,
  ADD COLUMN `payment_status` VARCHAR(50) NULL DEFAULT 'unpaid' AFTER `payment_method`,
  ADD COLUMN `fare` DECIMAL(10,2) NULL AFTER `total_amount`,
  ADD COLUMN `discount` DECIMAL(10,2) DEFAULT 0.00 AFTER `fare`,
  ADD COLUMN `notes` TEXT NULL AFTER `special_requests`,
  ADD COLUMN `seat_numbers` TEXT NULL AFTER `selected_seats`,
  ADD COLUMN `passenger_name` VARCHAR(150) NULL AFTER `passenger_details`,
  ADD COLUMN `passenger_phone` VARCHAR(20) NULL AFTER `passenger_name`,
  ADD COLUMN `boarding_point` VARCHAR(255) NULL AFTER `dropping_time`,
  ADD COLUMN `dropping_point` VARCHAR(255) NULL AFTER `boarding_point`;

SELECT 'Migration completed successfully!' as Status;
