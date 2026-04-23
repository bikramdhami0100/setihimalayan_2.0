import nodemailer from 'nodemailer';
import logger from '../utils/logger.js';

// Create transporter
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

/**
 * Send a generic email
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} html - HTML content
 * @param {Array} attachments - Optional attachments
 * @returns {Promise}
 */
export const sendEmail = async (to, subject, html, attachments = []) => {
    const mailOptions = {
        from: process.env.EMAIL_FROM,
        to,
        subject,
        html,
        attachments,
    };
    try {
        const info = await transporter.sendMail(mailOptions);
        logger.info(`Email sent to ${to}: ${info.messageId}`);
        return info;
    } catch (error) {
        logger.error(`Email error to ${to}: ${error.message}`);
        throw error;
    }
};

/**
 * Send booking confirmation email with ticket attached
 * @param {string} userEmail - Customer email
 * @param {Object} booking - Booking object
 * @param {Buffer} pdfBuffer - PDF ticket buffer
 * @returns {Promise}
 */
export const sendBookingConfirmation = async (userEmail, booking, pdfBuffer) => {
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #2c3e50; color: white; padding: 20px; text-align: center; }
                .content { padding: 20px; }
                .booking-details { background: #f4f4f4; padding: 15px; margin: 15px 0; border-radius: 5px; }
                .footer { text-align: center; padding: 20px; font-size: 12px; color: #777; }
                .button { display: inline-block; padding: 10px 20px; background: #3498db; color: white; text-decoration: none; border-radius: 5px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Booking Confirmed! 🎉</h1>
                </div>
                <div class="content">
                    <p>Dear ${booking.passenger_details?.name || 'Customer'},</p>
                    <p>Your bus ticket has been confirmed. Please find your booking details below:</p>
                    
                    <div class="booking-details">
                        <h3>Booking Reference: ${booking.booking_reference}</h3>
                        <p><strong>Route:</strong> ${booking.origin} → ${booking.destination}</p>
                        <p><strong>Departure:</strong> ${new Date(booking.departure_time).toLocaleString()}</p>
                        <p><strong>Seats:</strong> ${booking.selected_seats.join(', ')}</p>
                        <p><strong>Total Amount:</strong> NPR ${booking.total_amount}</p>
                    </div>
                    
                    <p>Your e-ticket is attached to this email. You can also download it from your dashboard.</p>
                    <p style="text-align: center;">
                        <a href="${process.env.FRONTEND_URL}/my-bookings/${booking.booking_reference}" class="button">View Booking</a>
                    </p>
                    <p>Thank you for choosing our service!</p>
                </div>
                <div class="footer">
                    <p>Bus Booking System | Support: support@busbooking.com | +977-1-1234567</p>
                </div>
            </div>
        </body>
        </html>
    `;
    
    const attachments = pdfBuffer ? [
        {
            filename: `ticket-${booking.booking_reference}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf'
        }
    ] : [];
    
    return sendEmail(userEmail, `Bus Ticket Confirmation - ${booking.booking_reference}`, html, attachments);
};

/**
 * Send password reset email
 * @param {string} to - User email
 * @param {string} resetToken - Password reset token
 * @returns {Promise}
 */
export const sendPasswordResetEmail = async (to, resetToken) => {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    const html = `
        <h1>Password Reset Request</h1>
        <p>You requested to reset your password. Click the link below to proceed:</p>
        <a href="${resetUrl}">Reset Password</a>
        <p>This link expires in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
    `;
    return sendEmail(to, 'Password Reset Request', html);
};

/**
 * Send welcome email to new user
 * @param {string} to - User email
 * @param {string} name - User full name
 * @returns {Promise}
 */
export const sendWelcomeEmail = async (to, name) => {
    const html = `
        <h1>Welcome to Bus Booking System, ${name}!</h1>
        <p>We're excited to have you on board. You can now start booking bus tickets online.</p>
        <a href="${process.env.FRONTEND_URL}/login">Login to your account</a>
    `;
    return sendEmail(to, 'Welcome to Bus Booking System', html);
};