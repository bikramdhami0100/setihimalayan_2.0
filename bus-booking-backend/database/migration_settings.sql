-- Add user settings columns to users table
ALTER TABLE users 
ADD COLUMN `notification_preferences` JSON NULL DEFAULT NULL AFTER `postal_code`,
ADD COLUMN `language` VARCHAR(10) DEFAULT 'en' AFTER `notification_preferences`;
