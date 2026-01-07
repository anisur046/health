require('dotenv').config();
const express = require('express');
require('dotenv').config();
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('./db'); // Universal DB Adapter

const app = express();
const port = process.env.PORT || 3001;

// ensure uploads directory exists
const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// serve uploaded files
// serve uploaded files
app.use('/uploads', express.static(UPLOAD_DIR));

// Initialize DB tables (Moved to db.js for centralized handling)
/*
(async () => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS contact_messages (
...
    `);
    console.log('Tables contact_messages and subscribers checked/created.');
  } catch (err) {
    console.error('Failed to init tables:', err.message);
  }
})();
*/

// Force download endpoint
app.get('/api/download/:filename', (req, res) => {
  const filename = req.params.filename;
  if (!filename || filename.includes('..') || filename.includes('/')) {
    return res.status(400).send('Invalid filename');
  }
  const filePath = path.join(UPLOAD_DIR, filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('File not found');
  }
  res.download(filePath, (err) => {
    if (err) console.error('Download error:', err);
  });
});

// CORS Configuration
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.get('/api/status', (req, res) => {
  res.json({ status: 'ok', database: 'MySQL', time: new Date().toISOString() });
});

app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello from backend (MySQL)' });
});

// Demo in-memory admin account (FOR DEVELOPMENT ONLY)
const demoAdmin = {
  id: 'admin',
  email: 'admin@localhost',
  password: 'admin123',
};

// Admin login endpoint

// Helper: is admin
const isAdmin = (req) => {
  const auth = (req.headers.authorization || '').trim();
  if (!auth) return false;
  if (auth === 'Bearer demo-admin-token') return true;
  if (auth.startsWith('Bearer admin-token-')) return true;
  return false;
};

// Admin login endpoint
app.post('/api/admin/login', async (req, res) => {
  const { userId, password } = req.body || {};
  if (!userId || !password) {
    return res.status(400).json({ ok: false, message: 'Missing userId or password' });
  }

  // 1. Check demo admin
  if ((userId === demoAdmin.id || userId === demoAdmin.email) && password === demoAdmin.password) {
    return res.json({ ok: true, message: 'Logged in', token: 'demo-admin-token' });
  }

  // 2. Check DB for admin user
  try {
    // Check by email or id, AND check role='admin'
    // Note: ID in DB is int, userId input might be string.
    const [rows] = await db.query('SELECT * FROM users WHERE (email = ? OR id = ?) AND password = ? AND role = ?', [userId, userId, password, 'admin']);
    if (rows.length > 0) {
      const user = rows[0];
      return res.json({ ok: true, message: 'Logged in', token: `admin-token-${user.id}`, user: { id: user.id, name: user.name, email: user.email } });
    }
  } catch (err) {
    console.error('Admin login db error:', err);
  }

  return res.status(401).json({ ok: false, message: 'Invalid credentials' });
});

// Helper: extract user id from Authorization header
const userIdFromAuthHeader = (req) => {
  let auth = (req.headers.authorization || '').trim();
  if (!auth) return null;
  if (auth.toLowerCase().startsWith('bearer ')) auth = auth.slice(7).trim();
  const m = auth.match(/^demo-token-(.+)$/);
  if (m) return m[1];
  return null;
};

// Admin create user
app.post('/api/admin/create-user', async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(401).json({ ok: false, message: 'Unauthorized' });
  }

  const { name, email, password } = req.body || {};
  if (!name || !email || !password) return res.status(400).json({ ok: false, message: 'Missing fields' });

  try {
    const [rows] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (rows.length > 0) return res.status(409).json({ ok: false, message: 'User already exists' });

    const [result] = await db.query('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)', [name, email, password, 'admin']);
    return res.json({ ok: true, message: 'Admin User created', user: { id: result.insertId, email, name, role: 'admin' } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: 'Database error' });
  }
});

// Admin list users
app.get('/api/admin/users', async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(401).json({ ok: false, message: 'Unauthorized' });
  }

  try {
    const [rows] = await db.query('SELECT id, name, email FROM users');
    res.json({ ok: true, users: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: 'Database error' });
  }
});

// Admin: create a new doctor
app.post('/api/admin/doctors', async (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ ok: false, message: 'Unauthorized' });

  const { name, specialty } = req.body || {};
  if (!name || !specialty) return res.status(400).json({ ok: false, message: 'Missing name or specialty' });

  try {
    const [result] = await db.query('INSERT INTO doctors (name, specialty) VALUES (?, ?)', [name, specialty]);
    return res.json({ ok: true, message: 'Doctor created', doctor: { id: result.insertId, name, specialty, availability: [] } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: 'Database error' });
  }
});

// Admin: list all doctors
app.get('/api/admin/doctors', async (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ ok: false, message: 'Unauthorized' });

  try {
    const [doctors] = await db.query('SELECT * FROM doctors');
    const [slots] = await db.query('SELECT * FROM availability');

    const fullDoctors = doctors.map(d => ({
      ...d,
      availability: slots.filter(s => s.doctorId === d.id).map(s => ({ ...s, booked: !!s.booked }))
    }));
    return res.json({ ok: true, doctors: fullDoctors });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: 'Database error' });
  }
});

// Citizen register
app.post('/api/citizen/register', async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) return res.status(400).json({ ok: false, message: 'Missing fields' });

  try {
    const [rows] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (rows.length > 0) return res.status(409).json({ ok: false, message: 'User already exists' });

    const [result] = await db.query('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)', [name, email, password, 'citizen']);
    const newUser = { id: result.insertId, email, name };
    return res.json({ ok: true, message: 'Registered', token: `demo-token-${newUser.id}`, user: newUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: 'Database error' });
  }
});

// Citizen login
app.post('/api/citizen/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ ok: false, message: 'Missing email or password' });

  try {
    const [rows] = await db.query('SELECT * FROM users WHERE email = ? AND password = ? AND role = ?', [email, password, 'citizen']);
    if (rows.length === 0) return res.status(401).json({ ok: false, message: 'Invalid credentials' });

    const row = rows[0];
    return res.json({ ok: true, message: 'Logged in', token: `demo-token-${row.id}`, user: { id: row.id, email: row.email, name: row.name } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: 'Database error' });
  }
});

// Citizen forgot password
app.post('/api/citizen/forgot', async (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ ok: false, message: 'Missing email' });

  try {
    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
      // For security, we usually don't reveal if user exists, but for dev we might want to know.
      // We'll mimic success to avoid enumeration, or return 404 if user prefers dev feedback.
      // Let's return success but log that user was not found.
      console.log(`[Forgot Password] Request for ${email} - User not found.`);
      return res.json({ ok: true, message: 'If an account exists, email sent.' });
    }

    const user = rows[0];
    // In a real app, generate a token, save hash to DB.
    // For this demo:
    console.log(`
      ======================================================
      [MOCK EMAIL SERVICE]
      To: ${email}
      Subject: Password Reset Request
      
      Hello ${user.name},
      You requested a password reset. 
      Click here to reset: http://localhost:3000/reset-password?token=mock-token-for-${user.id}
      ======================================================
    `);

    return res.json({ ok: true, message: 'If an account exists, email sent.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: 'Database error' });
  }
});

// Admin forgot password
app.post('/api/admin/forgot', (req, res) => {
  const { resetId } = req.body || {};
  return res.json({ ok: true, message: 'Reset link sent.' });
});

// Contact Us form
app.post('/api/contact', async (req, res) => {
  const { name, email, subject, message } = req.body || {};
  if (!name || !email || !message) return res.status(400).json({ ok: false, message: 'Missing fields' });

  try {
    await db.query('INSERT INTO contact_messages (name, email, subject, message) VALUES (?, ?, ?, ?)', [name, email, subject || '', message]);
    return res.json({ ok: true, message: 'Message sent' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: 'Database error' });
  }
});

// Subscribe form
app.post('/api/subscribe', async (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ ok: false, message: 'Missing email' });

  try {
    // Ignore duplicates or handle gracefully
    try {
      await db.query('INSERT INTO subscribers (email) VALUES (?)', [email]);
    } catch (e) {
      if (e.code === 'ER_DUP_ENTRY' || e.message.includes('UNIQUE')) {
        return res.json({ ok: true, message: 'Already subscribed' });
      }
      throw e;
    }
    return res.json({ ok: true, message: 'Subscribed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: 'Database error' });
  }
});

// Public: list doctors
app.get('/api/doctors', async (req, res) => {
  try {
    const [doctors] = await db.query('SELECT * FROM doctors');

    // MySQL uses standard SQL dates, format might need adjustment or is string by default in JS
    // We'll trust the driver to return Dates or ISO strings.
    const now = new Date(); // Javascript date object

    // Fetch VALID future slots
    const [slots] = await db.query("SELECT * FROM availability WHERE booked = 0 AND datetime > ?", [now]);

    const list = doctors.map(d => {
      const available = slots
        .filter(s => s.doctorId === d.id)
        .map(s => ({ datetime: s.datetime, place: s.place || null }));
      return { id: d.id, name: d.name, specialty: d.specialty, availableSlots: available };
    }).filter(d => d.availableSlots.length > 0);

    res.json({ ok: true, doctors: list });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: 'Database error' });
  }
});

// Citizen: list doctors
app.get('/api/citizen/doctors', async (req, res) => {
  const userId = userIdFromAuthHeader(req);
  if (!userId) return res.status(401).json({ ok: false, message: 'Unauthorized' });

  // Reuse logic: fetch doctors with future slots
  try {
    const [doctors] = await db.query('SELECT * FROM doctors');
    const [slots] = await db.query("SELECT * FROM availability WHERE booked = 0 AND datetime > ?", [new Date()]);

    const list = doctors.map(d => {
      const available = slots
        .filter(s => s.doctorId === d.id)
        .map(s => ({ datetime: s.datetime, place: s.place || null }));
      return { id: d.id, name: d.name, specialty: d.specialty, availableSlots: available };
    }).filter(d => d.availableSlots.length > 0);

    res.json({ ok: true, doctors: list });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: 'Database error' });
  }
});

// Admin: add availability
app.post('/api/admin/doctors/:id/availability', async (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ ok: false, message: 'Unauthorized' });

  const id = req.params.id;
  const { datetime, place } = req.body || {};
  if (!datetime) return res.status(400).json({ ok: false, message: 'No slot provided' });

  // MySQL datetime format: YYYY-MM-DD HH:MM:SS
  const jsDate = new Date(datetime);
  if (isNaN(jsDate.getTime())) return res.status(400).json({ ok: false, message: 'Invalid Date' });

  // Conveniently, mysql2 handles JS Date objects in parameterized queries often, but better safe with ISO string or similar
  // Let's rely on mysql2 serialization
  try {
    await db.query('INSERT INTO availability (doctorId, datetime, place, booked) VALUES (?, ?, ?, 0)', [id, jsDate, place]);
    return res.json({ ok: true, message: 'Slot added' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: 'Database error' });
  }
});

// Admin: remove availability
app.delete('/api/admin/doctors/:id/availability', async (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ ok: false, message: 'Unauthorized' });
  const { datetime } = req.body || {};

  try {
    await db.query('DELETE FROM availability WHERE doctorId = ? AND datetime = ?', [req.params.id, new Date(datetime)]);
    return res.json({ ok: true, message: 'Slot removed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: 'Database error' });
  }
});

// Create appointment
app.post('/api/citizen/appointments', async (req, res) => {
  const userId = userIdFromAuthHeader(req);
  if (!userId) return res.status(401).json({ ok: false, message: 'Unauthorized' });

  const { doctorId, datetime, reason } = req.body || {};
  if (!doctorId || !datetime) return res.status(400).json({ ok: false, message: 'Missing doctorId or datetime' });

  const jsDate = new Date(datetime);

  try {
    // Check slot
    const [slots] = await db.query('SELECT id, place FROM availability WHERE doctorId = ? AND datetime = ? AND booked = 0', [doctorId, jsDate]);
    if (slots.length === 0) return res.status(409).json({ ok: false, message: 'Slot not available' });
    const slot = slots[0];

    // Mark booked
    await db.query('UPDATE availability SET booked = 1 WHERE id = ?', [slot.id]);

    // Create appointment
    const [result] = await db.query('INSERT INTO appointments (userId, doctorId, datetime, reason, place, status) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, doctorId, jsDate, reason, slot.place, 'requested']);

    return res.json({ ok: true, message: 'Appointment requested', appointment: { id: result.insertId, userId, doctorId, datetime, reason, status: 'requested' } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: 'Database error' });
  }
});

// List appointments for citizen
app.get('/api/citizen/appointments', async (req, res) => {
  const userId = userIdFromAuthHeader(req);
  if (!userId) return res.status(401).json({ ok: false, message: 'Unauthorized' });

  try {
    const [rows] = await db.query('SELECT * FROM appointments WHERE userId = ?', [userId]);

    // Fetch attachments for these appointments
    if (rows.length > 0) {
      const ids = rows.map(r => r.id);
      const [attachments] = await db.query('SELECT * FROM appointment_attachments WHERE appointmentId IN (?)', [ids]);

      rows.forEach(row => {
        row.attachments = attachments.filter(a => a.appointmentId === row.id).map(a => ({
          ...a,
          url: `/uploads/${a.filename}`
        }));
      });
    }

    return res.json({ ok: true, appointments: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: 'Database error' });
  }
});

// Admin list appointments
app.get('/api/admin/appointments', async (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ ok: false, message: 'Unauthorized' });

  const sql = `
    SELECT a.*, u.name as userName, u.email as userEmail, d.name as doctorName, d.specialty as doctorSpecialty 
    FROM appointments a
    LEFT JOIN users u ON a.userId = u.id
    LEFT JOIN doctors d ON a.doctorId = d.id
  `;
  try {
    const [rows] = await db.query(sql);

    let attachments = [];
    if (rows.length > 0) {
      const ids = rows.map(r => r.id);
      const [attRows] = await db.query('SELECT * FROM appointment_attachments WHERE appointmentId IN (?)', [ids]);
      attachments = attRows;
    }

    const full = rows.map(r => ({
      id: r.id,
      datetime: r.datetime,
      reason: r.reason,
      status: r.status,
      rejectionReason: r.rejectionReason,
      userId: r.userId,
      doctorId: r.doctorId,
      user: { id: r.userId, name: r.userName, email: r.userEmail },
      doctor: { id: r.doctorId, name: r.doctorName, specialty: r.doctorSpecialty },
      attachments: attachments.filter(a => a.appointmentId === r.id).map(a => ({
        id: a.id,
        filename: a.filename,
        originalname: a.originalname,
        url: `/uploads/${a.filename}`
      }))
    }));
    return res.json({ ok: true, appointments: full });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: 'Database error' });
  }
});

// Admin approve
app.post('/api/admin/appointments/:id/approve', async (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ ok: false, message: 'Unauthorized' });

  try {
    const [result] = await db.query("UPDATE appointments SET status = 'approved' WHERE id = ?", [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ ok: false, message: 'Not found' });
    return res.json({ ok: true, message: 'Appointment approved' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: 'Database error' });
  }
});

// Admin reject
app.post('/api/admin/appointments/:id/reject', async (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ ok: false, message: 'Unauthorized' });

  try {
    const [result] = await db.query("UPDATE appointments SET status = 'rejected' WHERE id = ?", [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ ok: false, message: 'Not found' });
    return res.json({ ok: true, message: 'Appointment rejected' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: 'Database error' });
  }
});

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^a-z0-9_.-]/gi, '_');
    cb(null, `${Date.now()}-${safe}`);
  },
});
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ok = /pdf|jpe?g/i.test(file.mimetype) || /\.pdf$|\.jpe?g$/i.test(file.originalname);
    if (!ok) return cb(new Error('Only PDF and JPG files are allowed'));
    cb(null, true);
  },
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

app.post('/api/admin/appointments/:id/upload', upload.array('files'), async (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ ok: false, message: 'Unauthorized' });

  const id = req.params.id;
  if (!req.files || req.files.length === 0) return res.status(400).json({ ok: false, message: 'No files uploaded' });

  try {
    const savedAttachments = [];
    for (const f of req.files) {
      const [result] = await db.query(
        'INSERT INTO appointment_attachments (appointmentId, filename, originalname, mimetype) VALUES (?, ?, ?, ?)',
        [id, f.filename, f.originalname, f.mimetype]
      );
      savedAttachments.push({
        id: result.insertId,
        filename: f.filename,
        originalname: f.originalname,
        url: `/uploads/${f.filename}`
      });
    }
    return res.json({ ok: true, message: 'Files uploaded', attachments: savedAttachments });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, message: 'Database error' });
  }
});

app.delete('/api/admin/appointments/:id/attachments/:filename', async (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ ok: false, message: 'Unauthorized' });

  const { id, filename } = req.params;
  try {
    await db.query('DELETE FROM appointment_attachments WHERE appointmentId = ? AND filename = ?', [id, filename]);
    // Attempt to delete file from disk (optional, handled silently if fails)
    const filePath = path.join(UPLOAD_DIR, filename);
    fs.unlink(filePath, (err) => {
      if (err) console.error('Error deleting file:', err);
    });
    return res.json({ ok: true, message: 'Deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: 'Database error' });
  }
});


// Contact Us endpoint
app.post('/api/contact', async (req, res) => {
  const { name, email, message } = req.body || {};
  if (!name || !email || !message) {
    return res.status(400).json({ ok: false, message: 'Missing fields' });
  }

  try {
    await db.query('INSERT INTO messages (name, email, message) VALUES (?, ?, ?)', [name, email, message]);
    return res.json({ ok: true, message: 'Message sent successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: 'Database error' });
  }
});

// Export for Vercel serverless
module.exports = app;

// Only listen if not in Vercel environment
if (process.env.VERCEL !== '1') {
  app.listen(port, '0.0.0.0', () => {
    console.log(`Health backend listening on port ${port} (MySQL)`);
    console.log(`Accessible at http://127.0.0.1:${port}/`);
  });
}
