const db = require('./db-mysql');

async function createAttachmentsTable() {
    try {
        console.log('Creating appointment_attachments table...');
        await db.query(`
      CREATE TABLE IF NOT EXISTS appointment_attachments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        appointmentId INT,
        filename VARCHAR(255),
        originalname VARCHAR(255),
        mimetype VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (appointmentId) REFERENCES appointments(id) ON DELETE CASCADE
      )
    `);
        console.log('Table created.');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

createAttachmentsTable();
