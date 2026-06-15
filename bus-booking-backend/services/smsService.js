import https from 'https';
import logger from '../utils/logger.js';

const GUMP_API_KEY = process.env.GUMP_API_KEY || "Znd1LmY3NTAyY2Q2ZGRiMTFiMTdjYjJkNmUxYzY2ZWRmY2Q1MjNjM2U0OTg3YjdmNmIzNTFlZTE3NDViOGZkMmU5MTMuMg==";

export const sendSms = async (message, to) => {
    const data = JSON.stringify({
        to_addr: to,
        plain: { content: message },
        preserve: false,
        mode: "prod",
        tags: ["entrance"]
    });

    const options = {
        hostname: "message.gumpnow.com",
        path: "/api/v1/sms/send/",
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-gumpnow-auth": GUMP_API_KEY,
            "Content-Length": Buffer.byteLength(data)
        }
    };

    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', chunk => { body += chunk; });
            res.on('end', () => {
                logger.info(`SMS sent to ${to}: ${res.statusCode}`);
                resolve({ statusCode: res.statusCode, body });
            });
        });
        req.on('error', err => {
            logger.error(`SMS error to ${to}: ${err.message}`);
            reject(err);
        });
        req.write(data);
        req.end();
    });
};
