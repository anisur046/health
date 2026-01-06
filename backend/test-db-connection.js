require('dotenv').config();
const mysql = require('mysql2/promise');

async function testConnection() {
    console.log('Testing connection to:', process.env.MYSQL_HOST);
    try {
        const connection = await mysql.createConnection({
            host: process.env.MYSQL_HOST,
            user: process.env.MYSQL_USER,
            password: process.env.MYSQL_PASSWORD,
            database: process.env.MYSQL_DATABASE
        });
        console.log('Successfully connected to MySQL!');
        await connection.end();
    } catch (err) {
        console.error('Connection failed:', err.message);
        process.exit(1);
    }
}

testConnection();
