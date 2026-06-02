import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    port: process.env.DB_PORT || 3306,
    socketPath: process.env.DB_SOCKET_PATH,
    
    // enableKeepAlive: true,
    // keepAliveInitialDelay: 0
    ssl:{
        rejectUnauthorized: false
    }
});

export default pool;