import QRCode from 'qrcode';

/**
 * Generate QR code as data URL
 * @param {string} text - Text to encode
 * @returns {Promise<string>} Data URL (base64)
 */
export const generateQRDataURL = async (text) => {
    try {
        const qrDataUrl = await QRCode.toDataURL(text, {
            errorCorrectionLevel: 'H',
            margin: 2,
            width: 300
        });
        return qrDataUrl;
    } catch (err) {
        throw new Error(`QR generation failed: ${err.message}`);
    }
};

/**
 * Generate QR code as buffer (PNG)
 * @param {string} text - Text to encode
 * @returns {Promise<Buffer>} PNG buffer
 */
export const generateQRBuffer = async (text) => {
    try {
        const buffer = await QRCode.toBuffer(text, {
            errorCorrectionLevel: 'H',
            margin: 2,
            width: 300,
            type: 'png'
        });
        return buffer;
    } catch (err) {
        throw new Error(`QR buffer generation failed: ${err.message}`);
    }
};

/**
 * Generate QR code as a file (saves to disk)
 * @param {string} text - Text to encode
 * @param {string} filePath - Output file path
 * @returns {Promise<void>}
 */
export const generateQRFile = async (text, filePath) => {
    try {
        await QRCode.toFile(filePath, text, {
            errorCorrectionLevel: 'H',
            margin: 2,
            width: 300
        });
    } catch (err) {
        throw new Error(`QR file generation failed: ${err.message}`);
    }
};