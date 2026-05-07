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
        const doc = new PDFDocument({ size: 'A4', margin: 50, layout: 'portrait' });
        const buffers = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
            const pdfData = Buffer.concat(buffers);
            resolve(pdfData);
        });
        doc.on('error', reject);

        // Colors
        const primaryColor = '#1e3a8a'; // dark blue
        const accentColor = '#f97316'; // orange
        const lightGray = '#f3f4f6';
        const borderColor = '#e5e7eb';

        // Helper to draw rounded rectangle
        const roundedRect = (x, y, w, h, r) => {
            doc.path(`M ${x + r} ${y} h ${w - 2 * r} a ${r} ${r} 0 0 1 ${r} ${r} v ${h - 2 * r} a ${r} ${r} 0 0 1 -${r} ${r} h ${-w + 2 * r} a ${r} ${r} 0 0 1 -${r} -${r} v ${-h + 2 * r} a ${r} ${r} 0 0 1 ${r} -${r} z`);
        };

        // Header background
        doc.save();
        roundedRect(50, 50, 495, 80, 10);
        doc.fill(primaryColor).fill();
        doc.restore();

        // Header text
        doc.fillColor('white')
            .fontSize(22)
            .font('Helvetica-Bold')
            .text('SETI HIMALAYAN', 70, 70, { align: 'left' })
            .fontSize(10)
            .font('Helvetica')
            .text('Bus Ticket | Official E-Ticket', 70, 95)
            .fillColor('black');

        // QR Code (right side)
        const qrDataUrl = await QRCode.toDataURL(booking.booking_reference);
        doc.image(qrDataUrl, 470, 60, { width: 60 });

        // Booking reference & status
        doc.fontSize(12)
            .font('Helvetica-Bold')
            .text(`Booking ID: ${booking.booking_reference}`, 70, 150)
            .font('Helvetica')
            .fontSize(10)
            .text(`Booked on: ${moment(booking.created_at).format('DD MMM YYYY, hh:mm A')}`, 70, 170)
            .fillColor(accentColor)
            .text(`Status: ${booking.status.toUpperCase()}`, 70, 190)
            .fillColor('black');

        // Journey card
        doc.save();
        roundedRect(70, 220, 455, 120, 10);
        doc.fill(lightGray).fill();
        doc.restore();

        doc.fillColor(primaryColor)
            .fontSize(12)
            .font('Helvetica-Bold')
            .text('Journey Details', 85, 235)
            .fillColor('black')
            .fontSize(11)
            .font('Helvetica')
            .text(`From: ${schedule.origin}`, 85, 260)
            .text(`To: ${schedule.destination}`, 85, 280)
            .text(`Departure: ${moment(schedule.departure_time).format('DD MMM YYYY, hh:mm A')}`, 85, 300)
            .text(`Arrival: ${moment(schedule.arrival_time).format('DD MMM YYYY, hh:mm A')}`, 85, 320);

        // Duration (right side of journey card)
        const durationMinutes = moment(schedule.arrival_time).diff(moment(schedule.departure_time), 'minutes');
        const durationHours = Math.floor(durationMinutes / 60);
        const durationMins = durationMinutes % 60;
        doc.text(`Duration: ${durationHours}h ${durationMins}m`, 330, 300);

        // Bus Details
        doc.fillColor(primaryColor)
            .fontSize(12)
            .font('Helvetica-Bold')
            .text('Bus Details', 70, 365)
            .fillColor('black')
            .fontSize(11)
            .font('Helvetica')
            .text(`Bus Number: ${schedule.bus_number}`, 70, 390)
            .text(`Bus Type: ${schedule.bus_type || 'Standard'}`, 70, 410);

        // Amenities (if any)
        let amenities = [];
        try {
            if (schedule.amenities) amenities = JSON.parse(schedule.amenities);
        } catch(e) { amenities = []; }
        if (amenities.length) {
            doc.text(`Amenities: ${amenities.join(', ')}`, 70, 430);
        }

        // Passenger table header
        doc.fillColor(primaryColor)
            .fontSize(12)
            .font('Helvetica-Bold')
            .text('Passenger Details', 70, 470)
            .fillColor('black');

        // Table headers
        const tableTop = 495;
        const colSeat = 70;
        const colName = 150;
        const colAge = 300;
        const colGender = 380;

        doc.fontSize(10).font('Helvetica-Bold');
        doc.text('Seat', colSeat, tableTop);
        doc.text('Passenger Name', colName, tableTop);
        doc.text('Age', colAge, tableTop);
        doc.text('Gender', colGender, tableTop);

        // Draw line under header
        doc.moveTo(70, tableTop + 12)
            .lineTo(525, tableTop + 12)
            .strokeColor(borderColor)
            .stroke();

        // Table rows
        doc.fontSize(10).font('Helvetica');
        let rowY = tableTop + 25;
        const passengers = booking.passenger_details || [];
        const seats = booking.selected_seats || [];

        // If passenger_details is array, map each seat to its details
        // If passenger_details is empty, fallback to user name
        if (passengers.length > 0) {
            passengers.forEach((pass, idx) => {
                const seat = pass.seat_number || seats[idx] || 'N/A';
                const name = pass.name || user.full_name;
                const age = pass.age || 'N/A';
                const gender = pass.gender || 'N/A';
                doc.text(seat, colSeat, rowY);
                doc.text(name, colName, rowY);
                doc.text(String(age), colAge, rowY);
                doc.text(gender, colGender, rowY);
                rowY += 20;
                if (rowY > 750) {
                    doc.addPage();
                    rowY = 70;
                }
            });
        } else {
            // Single booking without passenger array – show user once
            doc.text(seats[0] || 'N/A', colSeat, rowY);
            doc.text(user.full_name, colName, rowY);
            doc.text('N/A', colAge, rowY);
            doc.text('N/A', colGender, rowY);
        }

        // Total amount
        doc.moveTo(70, rowY + 10)
            .lineTo(525, rowY + 10)
            .strokeColor(borderColor)
            .stroke();

        doc.fontSize(12).font('Helvetica-Bold')
            .text(`Total Amount: NPR ${parseFloat(booking.total_amount).toLocaleString()}`, 350, rowY + 25, { align: 'right' });

        // Footer notes
        const footerY = rowY + 70;
        doc.fontSize(9)
            .font('Helvetica-Oblique')
            .fillColor('#6b7280')
            .text('Thank you for choosing Seti Himalayan!', 70, footerY, { align: 'center' })
            .text('Please carry a valid ID proof. Arrive at the boarding point 30 minutes before departure.', 70, footerY + 15, { align: 'center' })
            .text('Cancellation policy: 80% refund if cancelled 24 hours before departure.', 70, footerY + 30, { align: 'center' })
            .fillColor('black');

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