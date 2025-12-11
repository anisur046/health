const db = require('./db-mysql');

async function checkDoctors() {
    try {
        const [rows] = await db.query('SELECT * FROM doctors');
        console.log('Doctors found:', rows.length);
        if (rows.length === 0) {
            console.log('Adding a test doctor...');
            await db.query('INSERT INTO doctors (name, specialty) VALUES (?, ?)', ['Dr. House', 'Diagnostic Medicine']);
            await db.query('INSERT INTO doctors (name, specialty) VALUES (?, ?)', ['Dr. Strange', 'Surgery']);
            console.log('Added test doctors.');
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkDoctors();
