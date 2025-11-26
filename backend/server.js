const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3001;

// ensure uploads directory exists
const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// serve uploaded files
app.use('/uploads', express.static(UPLOAD_DIR));

app.use(cors());
app.use(express.json());

// Simple request logger to help debug incoming requests
app.use((req, res, next) => {
  console.log(new Date().toISOString(), req.method, req.url);
  next();
});

app.get('/api/status', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello from backend' });
});

app.post('/api/echo', (req, res) => {
  res.json({ received: req.body });
});

// Demo in-memory admin account (FOR DEVELOPMENT ONLY)
const demoAdmin = {
  id: 'admin',
  email: 'admin@localhost',
  password: 'admin123', // DO NOT use plaintext passwords in production
};

// Admin login endpoint (development/demo)
app.post('/api/admin/login', (req, res) => {
  const { userId, password } = req.body || {};
  if (!userId || !password) {
    return res.status(400).json({ ok: false, message: 'Missing userId or password' });
  }

  // accept either id or email for userId
  const matches = (userId === demoAdmin.id || userId === demoAdmin.email) && password === demoAdmin.password;
  if (!matches) {
    return res.status(401).json({ ok: false, message: 'Invalid credentials' });
  }

  // return a simple demo token
  return res.json({ ok: true, message: 'Logged in', token: 'demo-admin-token' });
});

// Forgot password endpoint (development/demo)
app.post('/api/admin/forgot', (req, res) => {
  const { resetId } = req.body || {};
  if (!resetId) return res.status(400).json({ ok: false, message: 'Missing reset id' });

  // In a real app you'd look up the user and send an email. Here we just simulate success.
  const exists = resetId === demoAdmin.id || resetId === demoAdmin.email;
  // Respond 200 in all cases to avoid leaking which ids exist
  return res.json({ ok: true, message: 'If an account exists an email has been sent', accountFound: exists });
});

const demoUsers = [
  { id: 'user1', email: 'user1@localhost', name: 'Demo User', password: 'password123' },
];

// Admin create user (development/demo)
app.post('/api/admin/create-user', (req, res) => {
  // Expect Authorization: Bearer demo-admin-token
  const auth = (req.headers.authorization || '').trim();
  if (!auth || auth !== 'Bearer demo-admin-token') {
    return res.status(401).json({ ok: false, message: 'Unauthorized' });
  }

  const { name, email, password } = req.body || {};
  if (!name || !email || !password) return res.status(400).json({ ok: false, message: 'Missing fields' });

  const exists = demoUsers.find((u) => u.email === email);
  if (exists) return res.status(409).json({ ok: false, message: 'User already exists' });

  const newUser = { id: `user${demoUsers.length + 1}`, email, name, password };
  demoUsers.push(newUser);
  return res.json({ ok: true, message: 'User created', user: { id: newUser.id, email: newUser.email, name: newUser.name } });
});

// Admin list users (development/demo)
app.get('/api/admin/users', (req, res) => {
  const auth = (req.headers.authorization || '').trim();
  if (!auth || auth !== 'Bearer demo-admin-token') {
    return res.status(401).json({ ok: false, message: 'Unauthorized' });
  }

  // return users without passwords
  const users = demoUsers.map((u) => ({ id: u.id, email: u.email, name: u.name }));
  return res.json({ ok: true, users });
});

// Citizen register
app.post('/api/citizen/register', (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) return res.status(400).json({ ok: false, message: 'Missing fields' });
  const exists = demoUsers.find((u) => u.email === email);
  if (exists) return res.status(409).json({ ok: false, message: 'User already exists' });
  const newUser = { id: `user${demoUsers.length + 1}`, email, name, password };
  demoUsers.push(newUser);
  return res.json({ ok: true, message: 'Registered', token: `demo-token-${newUser.id}`, user: { id: newUser.id, email: newUser.email, name: newUser.name } });
});

// Citizen login
app.post('/api/citizen/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ ok: false, message: 'Missing email or password' });
  const user = demoUsers.find((u) => u.email === email && u.password === password);
  if (!user) return res.status(401).json({ ok: false, message: 'Invalid credentials' });
  return res.json({ ok: true, message: 'Logged in', token: `demo-token-${user.id}`, user: { id: user.id, email: user.email, name: user.name } });
});

// Citizen forgot password
app.post('/api/citizen/forgot', (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ ok: false, message: 'Missing email' });
  const exists = demoUsers.find((u) => u.email === email);
  // respond 200 in all cases to avoid leaking existence
  return res.json({ ok: true, message: 'If an account exists an email has been sent', accountFound: !!exists });
});

const doctors = [
  { id: 'doc1', name: 'Dr. Alice Smith', specialty: 'General Practitioner' },
  { id: 'doc2', name: 'Dr. Bob Jones', specialty: 'Cardiologist' },
  { id: 'doc3', name: 'Dr. Carol Evans', specialty: 'Dermatologist' },
];

const appointments = []; // { id, userId, doctorId, datetime, reason, status }

// Public: list doctors
app.get('/api/doctors', (req, res) => {
  res.json({ ok: true, doctors });
});

// Helper to get user id from demo token: Authorization: Bearer demo-token-<userId>
function userIdFromAuthHeader(req) {
  const auth = (req.headers.authorization || '').trim();
  if (!auth || !auth.startsWith('Bearer ')) return null;
  const token = auth.slice(7);
  // token format demo-token-user1
  if (!token.startsWith('demo-token-')) return null;
  return token.replace('demo-token-', '');
}

// Create appointment (citizen must be authenticated with demo token)
app.post('/api/citizen/appointments', (req, res) => {
  const userId = userIdFromAuthHeader(req);
  if (!userId) return res.status(401).json({ ok: false, message: 'Unauthorized' });

  const { doctorId, datetime, reason } = req.body || {};
  if (!doctorId || !datetime) return res.status(400).json({ ok: false, message: 'Missing doctorId or datetime' });

  const doctor = doctors.find((d) => d.id === doctorId);
  if (!doctor) return res.status(400).json({ ok: false, message: 'Doctor not found' });

  const id = `appt${appointments.length + 1}`;
  const appt = { id, userId, doctorId, datetime, reason: reason || '', status: 'requested' };
  appointments.push(appt);
  return res.json({ ok: true, message: 'Appointment requested', appointment: appt });
});

// List appointments for authenticated citizen
app.get('/api/citizen/appointments', (req, res) => {
  const userId = userIdFromAuthHeader(req);
  if (!userId) return res.status(401).json({ ok: false, message: 'Unauthorized' });

  const userAppts = appointments.filter((a) => a.userId === userId).map((a) => ({ ...a }));
  return res.json({ ok: true, appointments: userAppts });
});

// Admin list appointments (development/demo)
app.get('/api/admin/appointments', (req, res) => {
  const auth = (req.headers.authorization || '').trim();
  if (!auth || auth !== 'Bearer demo-admin-token') return res.status(401).json({ ok: false, message: 'Unauthorized' });

  const full = appointments.map((a) => {
    const user = demoUsers.find((u) => u.id === a.userId) || null;
    const doctor = doctors.find((d) => d.id === a.doctorId) || null;
    return {
      ...a,
      user: user ? { id: user.id, name: user.name, email: user.email } : null,
      doctor: doctor ? { id: doctor.id, name: doctor.name, specialty: doctor.specialty } : null,
    };
  });
  return res.json({ ok: true, appointments: full });
});

// Multer setup for uploads (PDF and JPG)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    // prefix with timestamp to avoid collisions
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
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// Admin upload attachment for an appointment (accept multiple files)
app.post('/api/admin/appointments/:id/upload', upload.array('files'), (req, res) => {
  const auth = (req.headers.authorization || '').trim();
  if (!auth || auth !== 'Bearer demo-admin-token') return res.status(401).json({ ok: false, message: 'Unauthorized' });

  const id = req.params.id;
  const appt = appointments.find((a) => a.id === id);
  if (!appt) return res.status(404).json({ ok: false, message: 'Appointment not found' });

  if (!req.files || req.files.length === 0) return res.status(400).json({ ok: false, message: 'No files uploaded' });

  // ensure attachments array
  if (!Array.isArray(appt.attachments)) appt.attachments = [];
  const added = [];
  req.files.forEach((f) => {
    const fileMeta = { filename: f.filename, originalname: f.originalname, mimetype: f.mimetype, size: f.size, url: `/uploads/${f.filename}` };
    appt.attachments.push(fileMeta);
    added.push(fileMeta);
  });

  return res.json({ ok: true, message: 'Files uploaded', attachments: added });
});

// Admin delete attachment for an appointment
app.delete('/api/admin/appointments/:id/attachments/:filename', (req, res) => {
  const auth = (req.headers.authorization || '').trim();
  if (!auth || auth !== 'Bearer demo-admin-token') return res.status(401).json({ ok: false, message: 'Unauthorized' });

  const id = req.params.id;
  const filename = req.params.filename;
  const appt = appointments.find((a) => a.id === id);
  if (!appt) return res.status(404).json({ ok: false, message: 'Appointment not found' });
  if (!Array.isArray(appt.attachments)) appt.attachments = [];

  const idx = appt.attachments.findIndex((att) => att.filename === filename);
  if (idx === -1) return res.status(404).json({ ok: false, message: 'Attachment not found' });

  const [removed] = appt.attachments.splice(idx, 1);
  const filePath = path.join(UPLOAD_DIR, removed.filename);
  fs.unlink(filePath, (err) => {
    // if unlink fails, log but still return success for metadata removal
    if (err && err.code !== 'ENOENT') console.error('Failed to delete file', filePath, err);
    return res.json({ ok: true, message: 'Attachment deleted', attachment: removed });
  });
});

// Admin approve appointment
app.post('/api/admin/appointments/:id/approve', (req, res) => {
  const auth = (req.headers.authorization || '').trim();
  if (!auth || auth !== 'Bearer demo-admin-token') return res.status(401).json({ ok: false, message: 'Unauthorized' });

  const id = req.params.id;
  const appt = appointments.find((a) => a.id === id);
  if (!appt) return res.status(404).json({ ok: false, message: 'Appointment not found' });
  appt.status = 'approved';
  return res.json({ ok: true, message: 'Appointment approved', appointment: appt });
});

// Admin reject appointment (optional reason in body)
app.post('/api/admin/appointments/:id/reject', (req, res) => {
  const auth = (req.headers.authorization || '').trim();
  if (!auth || auth !== 'Bearer demo-admin-token') return res.status(401).json({ ok: false, message: 'Unauthorized' });

  const id = req.params.id;
  const { reason } = req.body || {};
  const appt = appointments.find((a) => a.id === id);
  if (!appt) return res.status(404).json({ ok: false, message: 'Appointment not found' });
  appt.status = 'rejected';
  if (reason) appt.rejectionReason = reason;
  return res.json({ ok: true, message: 'Appointment rejected', appointment: appt });
});

app.listen(port, () => {
  console.log(`Health backend listening on port ${port}`);
});
