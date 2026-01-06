
require('dotenv').config();
const db = require('./db');

async function testQuery() {
    console.log('Testing DB connection...');
    try {
        const [doctors] = await db.query('SELECT * FROM doctors');
        console.log('Doctors query successful. Count:', doctors.length);
    } catch (err) {
        console.error('Doctors query failed:', err.message);
    }

    console.log('Testing Availability query...');
    try {
        // This is the query from server.js line 206 and 230
        const [slots] = await db.query("SELECT * FROM availability WHERE booked = 0 AND datetime > ?", [new Date()]);
        console.log('Availability query successful. Count:', slots.length);
    } catch (err) {
        console.error('Availability query failed:', err.message);
        if (err.errno === 1305) {
            console.log('CONFIRMED: Error 1305 means function does not exist (MySQL vs SQLite issue).');
        }
    }

    process.exit();
}

testQuery();
