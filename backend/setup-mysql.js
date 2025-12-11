const mysql = require('mysql2/promise');

async function setup() {
  console.log('Attempting to connect to MySQL...');
  try {
    // Connect to server (no DB selected yet)
    const connection = await mysql.createConnection({
      host: '127.0.0.1', // localhost often resolves to ::1 which mysql might not listen on
      user: 'root',
      password: '', // Assume empty password
    });

    console.log('Connected to MySQL server.');

    // Create DB
    await connection.query(`CREATE DATABASE IF NOT EXISTS health`);
    console.log('Database "health" created or checked.');

    await connection.end();

    // Now connect to the health DB to create tables
    const db = await mysql.createConnection({
      host: '127.0.0.1',
      user: 'root',
      password: '',
      database: 'health'
    });

    // Users
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255),
        password VARCHAR(255),
        role VARCHAR(50) DEFAULT 'citizen',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Doctors
    await db.query(`
      CREATE TABLE IF NOT EXISTS doctors (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255),
        specialty VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Availability
    await db.query(`
      CREATE TABLE IF NOT EXISTS availability (
        id INT AUTO_INCREMENT PRIMARY KEY,
        doctorId INT,
        datetime DATETIME,
        place VARCHAR(255),
        booked BOOLEAN DEFAULT FALSE,
        FOREIGN KEY (doctorId) REFERENCES doctors(id) ON DELETE CASCADE
      )
    `);

    // Appointments
    await db.query(`
      CREATE TABLE IF NOT EXISTS appointments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId INT,
        doctorId INT,
        datetime DATETIME,
        reason TEXT,
        place VARCHAR(255),
        status VARCHAR(50) DEFAULT 'requested',
        rejectionReason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (doctorId) REFERENCES doctors(id) ON DELETE CASCADE
      )
    `);

    // Attachments
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


    // Messages (Contact Us)
    await db.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255),
        email VARCHAR(255),
        message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Tables initialized in MySQL.');
    await db.end();

  } catch (err) {
    console.error('MySQL Setup Error:', err.message);
    process.exit(1);
  }
}

setup();
