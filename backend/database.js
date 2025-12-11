const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create a database file named 'health.db' in the backend directory
const dbPath = path.resolve(__dirname, 'health.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database ' + dbPath + ': ' + err.message);
  } else {
    console.log('Connected to the SQLite database.');
  }
});

// Create tables if they don't exist
db.serialize(() => {
  // Users table
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    name TEXT,
    password TEXT,
    role TEXT DEFAULT 'citizen'
  )`);

  // Doctors table
  db.run(`CREATE TABLE IF NOT EXISTS doctors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    specialty TEXT
  )`);

  // Availability table
  db.run(`CREATE TABLE IF NOT EXISTS availability (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    doctorId INTEGER,
    datetime TEXT,
    place TEXT,
    booked INTEGER DEFAULT 0,
    FOREIGN KEY(doctorId) REFERENCES doctors(id)
  )`);

  // Appointments table
  db.run(`CREATE TABLE IF NOT EXISTS appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER,
    doctorId INTEGER,
    datetime TEXT,
    reason TEXT,
    status TEXT DEFAULT 'requested',
    FOREIGN KEY(userId) REFERENCES users(id),
    FOREIGN KEY(doctorId) REFERENCES doctors(id)
  )`);

  console.log('Database tables initialized.');
});

module.exports = db;
