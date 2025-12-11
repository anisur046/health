const db = require('./db-mysql');

async function addSlots() {
    try {
        const [doctors] = await db.query('SELECT * FROM doctors');
        if (doctors.length === 0) {
            console.log('No doctors found.');
            process.exit(0);
        }

        console.log(`Adding slots for ${doctors.length} doctors...`);

        const now = new Date();
        // Add 5 slots for the next 5 days
        for (const doc of doctors) {
            for (let i = 1; i <= 5; i++) {
                const date = new Date(now);
                date.setDate(date.getDate() + i);
                date.setHours(9, 0, 0, 0); // 9:00 AM

                // Check if exists
                const [exists] = await db.query('SELECT * FROM availability WHERE doctorId = ? AND datetime = ?', [doc.id, date]);
                if (exists.length === 0) {
                    await db.query('INSERT INTO availability (doctorId, datetime, place) VALUES (?, ?, ?)', [doc.id, date, 'Clinic Room A']);
                    console.log(`Added slot for Dr. ${doc.name} at ${date.toLocaleString()}`);
                }
            }
        }
        console.log('Done.');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

addSlots();
