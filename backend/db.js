const mysql = require('mysql2/promise');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const util = require('util');

// Wrapper to make SQLite behave like mysql2/promise (returning [rows])
class SQLiteWrapper {
    constructor() {
        // Use /tmp on Vercel (serverless), local path otherwise
        const dbPath = process.env.VERCEL
            ? '/tmp/health.db'
            : path.resolve(__dirname, 'health.db');
        this.db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                console.error('SQLite connection error:', err);
            } else {
                console.log(`Connected to SQLite at ${dbPath}`);
            }
        });
        this.initialized = this.init();
    }

    async query(sql, params = []) {
        // Wait for initialization to complete
        await this.initialized;

        // Convert MySQL '?' params to SQLite '?' params (they are the same)
        // Handle INSERT/UPDATE/DELETE (run) vs SELECT (all)
        const method = sql.trim().toUpperCase().startsWith('SELECT') ? 'all' : 'run';

        return new Promise((resolve, reject) => {
            this.db[method](sql, params, function (err, rows) {
                if (err) {
                    // console.error('SQLite Error:', err.message, sql);
                    return reject(err);
                }
                // Simulate MySQL return structure: [rows, fields]
                // For INSERT, 'this' contains lastID and changes
                if (method === 'run') {
                    // mysql2 returns [ResultSetHeader]
                    const result = {
                        insertId: this.lastID,
                        affectedRows: this.changes
                    };
                    resolve([result, null]);
                } else {
                    resolve([rows, null]);
                }
            });
        });
    }

    // Initialize tables if not exist (Schema matching MySQL setup)
    async init() {
        return new Promise((resolve, reject) => {
            this.db.serialize(() => {
                this.db.run(`CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    email TEXT UNIQUE,
                    name TEXT,
                    password TEXT,
                    role TEXT DEFAULT 'citizen',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )`, (err) => {
                    if (err) console.error('Error creating users table:', err);
                });

                this.db.run(`CREATE TABLE IF NOT EXISTS doctors (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT,
                    specialty TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )`, (err) => {
                    if (err) console.error('Error creating doctors table:', err);
                });

                this.db.run(`CREATE TABLE IF NOT EXISTS availability (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    doctorId INTEGER,
                    datetime TEXT,
                    place TEXT,
                    booked INTEGER DEFAULT 0,
                    FOREIGN KEY(doctorId) REFERENCES doctors(id)
                )`, (err) => {
                    if (err) console.error('Error creating availability table:', err);
                });

                this.db.run(`CREATE TABLE IF NOT EXISTS appointments (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    userId INTEGER,
                    doctorId INTEGER,
                    datetime TEXT,
                    reason TEXT,
                    place TEXT,
                    status TEXT DEFAULT 'requested',
                    rejectionReason TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(userId) REFERENCES users(id),
                    FOREIGN KEY(doctorId) REFERENCES doctors(id)
                )`, (err) => {
                    if (err) console.error('Error creating appointments table:', err);
                });

                this.db.run(`CREATE TABLE IF NOT EXISTS appointment_attachments (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    appointmentId INTEGER,
                    filename TEXT,
                    originalname TEXT,
                    mimetype TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(appointmentId) REFERENCES appointments(id)
                )`, (err) => {
                    if (err) {
                        console.error('Error creating appointment_attachments table:', err);
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            });
        });
    }
}

let pool;

// Simple logic: If running locally with MySQL running, use it.
// If on Render (usually no local MySQL) or fallback, use SQLite.
async function getDB() {
    if (pool) return pool;

    // Try MySQL first if configured or localhost
    // Modify this condition to prefer SQLite in production (Render) unless specific ENV vars are set
    const useMySQL = process.env.MYSQL_HOST || (process.env.NODE_ENV !== 'production');

    if (useMySQL && !process.env.FORCE_SQLITE) {
        try {
            pool = mysql.createPool({
                host: process.env.MYSQL_HOST || '127.0.0.1',
                user: process.env.MYSQL_USER || 'root',
                password: process.env.MYSQL_PASSWORD || '',
                database: process.env.MYSQL_DATABASE || 'health',
                waitForConnections: true,
                connectionLimit: 10,
                queueLimit: 0,
                connectTimeout: 2000 // fail fast
            });
            // Test connection
            await pool.query('SELECT 1');
            console.log('Using MySQL Database');
            await initMySQL(pool);
            return pool;
        } catch (err) {
            console.log('MySQL connection failed, falling back to SQLite:', err.message);
        }
    }

    console.log('Using SQLite Database');
    pool = new SQLiteWrapper();
    return pool;
}

// Helper to initialize MySQL tables
async function initMySQL(pool) {
    const queries = [
        `CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            email VARCHAR(255) UNIQUE,
            name VARCHAR(255),
            password VARCHAR(255),
            role VARCHAR(50) DEFAULT 'citizen',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS doctors (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255),
            specialty VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS availability (
            id INT AUTO_INCREMENT PRIMARY KEY,
            doctorId INT,
            datetime DATETIME,
            place VARCHAR(255),
            booked BOOLEAN DEFAULT FALSE,
            FOREIGN KEY(doctorId) REFERENCES doctors(id) ON DELETE CASCADE
        )`,
        `CREATE TABLE IF NOT EXISTS appointments (
            id INT AUTO_INCREMENT PRIMARY KEY,
            userId INT,
            doctorId INT,
            datetime DATETIME,
            reason TEXT,
            place VARCHAR(255),
            status VARCHAR(50) DEFAULT 'requested',
            rejectionReason TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY(doctorId) REFERENCES doctors(id) ON DELETE CASCADE
        )`,
        `CREATE TABLE IF NOT EXISTS appointment_attachments (
            id INT AUTO_INCREMENT PRIMARY KEY,
            appointmentId INT,
            filename VARCHAR(255),
            originalname VARCHAR(255),
            mimetype VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(appointmentId) REFERENCES appointments(id) ON DELETE CASCADE
        )`,
        `CREATE TABLE IF NOT EXISTS contact_messages (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255),
            email VARCHAR(255),
            subject VARCHAR(255),
            message TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS subscribers (
            id INT AUTO_INCREMENT PRIMARY KEY,
            email VARCHAR(255) UNIQUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`
    ];

    for (const sql of queries) {
        try {
            await pool.query(sql);
        } catch (err) {
            console.error('Error initializing MySQL table:', err.message);
        }
    }
    console.log('MySQL Tables initialized.');
}

// Export a proxy that delegates to the lazy-loaded pool
module.exports = {
    query: async (sql, params) => {
        const db = await getDB();
        return db.query(sql, params);
    }
};
