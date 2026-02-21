const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,  // ← ADD THIS LINE
    user: process.env.DB_USER || process.env.DB_USERNAME || 'root',  // ← ALSO SUPPORT DB_USERNAME
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'coding_platform',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test connection
pool.getConnection()
    .then(conn => {
        console.log('✅ MySQL connected successfully');
        console.log(`📍 Host: ${process.env.DB_HOST}:${process.env.DB_PORT}`);
        console.log(`🗄️  Database: ${process.env.DB_NAME}`);
        conn.release();
    })
    .catch(err => {
        console.error('❌ MySQL connection error:', err.message);
        console.error('Connection details:');
        console.error(`   Host: ${process.env.DB_HOST}`);
        console.error(`   Port: ${process.env.DB_PORT}`);
        console.error(`   Database: ${process.env.DB_NAME}`);
        console.error(`   User: ${process.env.DB_USER || process.env.DB_USERNAME}`);
    });

module.exports = pool;