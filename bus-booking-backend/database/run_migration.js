import fs from 'fs';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));

async function runMigration() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true,
  });

  try {
    // Check existing columns in bookings table
    const [columns] = await connection.execute(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'bookings'`,
      [process.env.DB_NAME]
    );
    const existingColumns = new Set(columns.map(c => c.COLUMN_NAME));

    const migrations = [
      { col: 'payment_method', sql: "ADD COLUMN `payment_method` VARCHAR(50) NULL DEFAULT 'cash' AFTER `payment_gateway`" },
      { col: 'payment_status', sql: "ADD COLUMN `payment_status` VARCHAR(50) NULL DEFAULT 'unpaid' AFTER `payment_method`" },
      { col: 'fare', sql: 'ADD COLUMN `fare` DECIMAL(10,2) NULL AFTER `total_amount`' },
      { col: 'discount', sql: 'ADD COLUMN `discount` DECIMAL(10,2) DEFAULT 0.00 AFTER `fare`' },
      { col: 'notes', sql: 'ADD COLUMN `notes` TEXT NULL AFTER `special_requests`' },
      { col: 'seat_numbers', sql: 'ADD COLUMN `seat_numbers` TEXT NULL AFTER `selected_seats`' },
      { col: 'passenger_name', sql: 'ADD COLUMN `passenger_name` VARCHAR(150) NULL AFTER `passenger_details`' },
      { col: 'passenger_phone', sql: 'ADD COLUMN `passenger_phone` VARCHAR(20) NULL AFTER `passenger_name`' },
      { col: 'boarding_point', sql: 'ADD COLUMN `boarding_point` VARCHAR(255) NULL AFTER `dropping_time`' },
      { col: 'dropping_point', sql: 'ADD COLUMN `dropping_point` VARCHAR(255) NULL AFTER `boarding_point`' },
    ];

    for (const m of migrations) {
      if (!existingColumns.has(m.col)) {
        await connection.execute(`ALTER TABLE bookings ${m.sql}`);
        console.log(`  + Added column \`${m.col}\``);
      } else {
        console.log(`  - Column \`${m.col}\` already exists, skipped`);
      }
    }

    console.log('Migration completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err.message);
  } finally {
    await connection.end();
  }
}

runMigration();
