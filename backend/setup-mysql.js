const mysql = require('mysql2/promise');
require('dotenv').config();

async function setup() {
  console.log('Attempting to connect to MySQL...');
  try {
    const db = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE
    });

    console.log(`Connected to MySQL server at ${process.env.MYSQL_HOST}.`);

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
