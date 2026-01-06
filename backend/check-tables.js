require('dotenv').config();
const mysql = require('mysql2/promise');

async function checkTables() {
    const db = await mysql.createConnection({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE
    });

    const [rows] = await db.query("SHOW TABLES");
    console.log("Tables in database:");
    rows.forEach(row => console.log(Object.values(row)[0]));
    await db.end();
}

checkTables();
