
import http from 'http';
import app from './app.js';
import { initSocket } from './config/socket.js';
import { startCleanupJob } from './services/cleanupService.js';
import logger from './utils/logger.js';

const server = http.createServer(app);
const io = initSocket(server);
app.set('io', io);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    logger.info(`🚀 Server running on port ${PORT}`);
    logger.info(`📡 Socket.IO ready`);
    startCleanupJob();  // starts periodic cleanup of expired seat locks (every 60 sec)
});

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM received, closing server...');
    server.close(() => {
        logger.info('Server closed');
        process.exit(0);
    });
});