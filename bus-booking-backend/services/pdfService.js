import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import moment from 'moment';

/**
 * Generate PDF ticket for a booking
 * @param {Object} booking - Booking object
 * @param {Object} schedule - Schedule object with route and bus details
 * @param {Object} user - User object
 * @returns {Promise<Buffer>} PDF buffer
 */
export const generateTicketPDF = async (booking, schedule, user) => {
    return new Promise(async (resolve, reject) => {
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const buffers = [];
        
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
            const pdfData = Buffer.concat(buffers);
            resolve(pdfData);
        });
        doc.on('error', reject);
        
        // Header with logo/border
        doc.rect(50, 50, 495, 750).stroke();
        doc.fontSize(24).font('Helvetica-Bold').text('BUS TICKET', { align: 'center' });
        doc.moveDown();
        
        // Booking reference as QR code
        const qrDataUrl = await QRCode.toDataURL(booking.booking_reference);
        doc.image(qrDataUrl, 450, 80, { width: 80 });
        
        // Booking info
        doc.fontSize(12).font('Helvetica');
        doc.text(`Booking Reference: ${booking.booking_reference}`, 70, 120);
        doc.text(`Booking Date: ${moment(booking.created_at).format('DD/MM/YYYY HH:mm')}`, 70, 140);
        doc.text(`Status: ${booking.status.toUpperCase()}`, 70, 160);
        
        doc.moveDown();
        
        // Journey details
        doc.fontSize(14).font('Helvetica-Bold').text('Journey Details', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(12).font('Helvetica');
        doc.text(`From: ${schedule.origin}`, 70, 210);
        doc.text(`To: ${schedule.destination}`, 70, 230);
        doc.text(`Distance: ${schedule.distance_km} km`, 70, 250);
        doc.text(`Departure: ${moment(schedule.departure_time).format('DD/MM/YYYY HH:mm')}`, 70, 270);
        doc.text(`Arrival: ${moment(schedule.arrival_time).format('DD/MM/YYYY HH:mm')}`, 70, 290);
        doc.text(`Duration: ${schedule.duration_minutes || 'N/A'} minutes`, 70, 310);
        
        doc.moveDown();
        
        // Bus details
        doc.fontSize(14).font('Helvetica-Bold').text('Bus Details', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(12).font('Helvetica');
        doc.text(`Bus Number: ${schedule.bus_number}`, 70, 360);
        doc.text(`Bus Type: ${schedule.bus_type}`, 70, 380);
        if (schedule.amenities) {
            const amenities = JSON.parse(schedule.amenities);
            doc.text(`Amenities: ${amenities.join(', ')}`, 70, 400);
        }
        
        doc.moveDown();
        
        // Passenger & Seats
        doc.fontSize(14).font('Helvetica-Bold').text('Passenger Details', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(12).font('Helvetica');
        doc.text(`Name: ${user.full_name}`, 70, 450);
        doc.text(`Email: ${user.email}`, 70, 470);
        doc.text(`Phone: ${user.phone}`, 70, 490);
        doc.text(`Selected Seats: ${booking.selected_seats.join(', ')}`, 70, 510);
        
        if (booking.passenger_details && booking.passenger_details.age) {
            doc.text(`Age: ${booking.passenger_details.age}`, 70, 530);
            doc.text(`Gender: ${booking.passenger_details.gender || 'N/A'}`, 70, 550);
        }
        
        doc.moveDown();
        
        // Payment info
        doc.fontSize(14).font('Helvetica-Bold').text('Payment Information', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(12).font('Helvetica');
        doc.text(`Total Amount: NPR ${booking.total_amount}`, 70, 600);
        doc.text(`Payment Status: ${booking.status === 'confirmed' ? 'Paid' : 'Pending'}`, 70, 620);
        
        // Footer
        doc.moveDown(2);
        doc.fontSize(10).font('Helvetica-Oblique').text('Thank you for choosing our service! Please carry a valid ID proof.', { align: 'center' });
        doc.text('This ticket is valid only for the specified journey. Please report 30 minutes before departure.', { align: 'center' });
        
        doc.end();
    });
};

/**
 * Generate a simplified boarding pass (smaller format)
 * @param {Object} booking - Booking object
 * @param {Object} schedule - Schedule object
 * @returns {Promise<Buffer>}
 */
export const generateBoardingPass = async (booking, schedule) => {
    return new Promise(async (resolve, reject) => {
        const doc = new PDFDocument({ size: [200, 600], margin: 10 });
        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);
        
        const qrDataUrl = await QRCode.toDataURL(booking.booking_reference);
        doc.image(qrDataUrl, 50, 20, { width: 100 });
        doc.fontSize(10).text(`Ref: ${booking.booking_reference}`, { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).font('Helvetica-Bold').text(`${schedule.origin} → ${schedule.destination}`, { align: 'center' });
        doc.fontSize(10).font('Helvetica').text(`Date: ${moment(schedule.departure_time).format('DD/MM')}`, { align: 'center' });
        doc.text(`Seats: ${booking.selected_seats.join(',')}`, { align: 'center' });
        doc.text(`Bus: ${schedule.bus_number}`, { align: 'center' });
        
        doc.end();
    });
};