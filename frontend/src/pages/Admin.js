import React, { useState, useEffect } from 'react';

// Prefer REACT_APP_API_BASE when provided. In development default to localhost:3001
// to avoid proxy/misrouting issues (restart CRA after changing package.json/.env).
const DEFAULT_DEV_BACKEND = 'http://localhost:3001/api';
export default function Admin() {
    const API_BASE = process.env.REACT_APP_API_BASE || (process.env.NODE_ENV === 'development' ? DEFAULT_DEV_BACKEND : '/api');

    // Detect a likely misconfiguration: production build using relative /api on a static host
    const isProdNoApi = (() => {
        try {
            const host = (typeof window !== 'undefined' && window.location && window.location.hostname) || '';
            const isLocal = host === 'localhost' || host === '127.0.0.1';
            // If API_BASE is relative (starts with '/') and we are not on localhost, it's likely the backend is not deployed
            return (API_BASE && API_BASE.startsWith('/')) && !isLocal && process.env.NODE_ENV === 'production';
        } catch (e) {
            return false;
        }
    })();

    // helper: read response as text and safely parse JSON if possible
    const parseResponse = async (res) => {
        const text = await res.text();
        if (!text) return {};
        try {
            return JSON.parse(text);
        } catch (err) {
            // Log raw response to aid debugging proxy/html errors
            console.error('Admin.parseResponse: non-JSON response', text.substring(0, 200));
            return { message: text, _raw: text };
        }
    };

    const [userId, setUserId] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [showForgot, setShowForgot] = useState(false);
    const [resetId, setResetId] = useState('');
    const [sendingReset, setSendingReset] = useState(false);

    // Admin authenticated state (token stored in localStorage)
    const [adminToken, setAdminToken] = useState(() => localStorage.getItem('adminToken') || '');

    // Create user fields (admin-only)
    const [createName, setCreateName] = useState('')
    const [createEmail, setCreateEmail] = useState('');
    const [createPassword, setCreatePassword] = useState('');
    const [creating, setCreating] = useState(false);
    // admin users list
    const [users, setUsers] = useState([]);
    // admin appointments
    const [appointments, setAppointments] = useState([]);
    const [loadingAppts, setLoadingAppts] = useState(false);
    const [uploadingId, setUploadingId] = useState(null);

    // doctors + availability management (admin)
    const [doctors, setDoctors] = useState([]);
    const [loadingDoctors, setLoadingDoctors] = useState(false);
    // per-doctor input value for adding a slot (datetime-local value)
    const [slotDatetime, setSlotDatetime] = useState({});
    // per-doctor place input
    const [slotPlace, setSlotPlace] = useState({});
    // when a doctor is just created allow immediate scheduling
    const [selectedDoctorSchedule, setSelectedDoctorSchedule] = useState('');

    // Create doctor fields (admin-only)
    const [docId, setDocId] = useState('');
    const [docName, setDocName] = useState('');
    const [docSpecialty, setDocSpecialty] = useState('');
    const [creatingDoctor, setCreatingDoctor] = useState(false);

    // Helper to build upload/download base URL: if API_BASE is an absolute url use that without /api, otherwise use empty string so relative /uploads works
    const backendBase = API_BASE && API_BASE.startsWith('http') ? API_BASE.replace(/\/api$/, '') : '';

    // fetch admin users (requires adminToken)
    const fetchUsers = async (token) => {
        if (!token) return;
        try {
            const res = await fetch(`${API_BASE}/admin/users`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            });
            console.debug('Admin fetch users GET', `${API_BASE}/admin/users`);
            const data = await parseResponse(res);
            if (!res.ok) {
                const raw = (data && data._raw) || data.message || '';
                if (raw && raw.toLowerCase().includes('proxy error')) {
                    setError('Network/proxy error: unable to reach backend. Is the backend running?');
                } else {
                    setError(data.message || `Unable to fetch users (${res.status})`);
                }
                return;
            }
            setUsers(data.users || []);
        } catch (err) {
            setError(err.message || 'Unable to fetch users');
        }
    };

    // fetch admin appointments
    const fetchAppointments = async (token) => {
        if (!token) return;
        setLoadingAppts(true);
        try {
            const res = await fetch(`${API_BASE}/admin/appointments`, {
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            });
            console.debug('Admin fetch appointments GET', `${API_BASE}/admin/appointments`);
            const data = await parseResponse(res);
            if (!res.ok) {
                const raw = (data && data._raw) || data.message || '';
                // If the backend dev server returned HTML like "Cannot GET /api/..." surface that clearly
                if (raw && typeof raw === 'string' && raw.toLowerCase().includes('cannot get')) {
                    setError(`Backend returned HTML error: ${raw.split('\n')[0]}. Is the backend running and are you sending the correct request?`);
                } else if (raw && raw.toLowerCase().includes('proxy error')) {
                    setError('Network/proxy error: unable to reach backend. Is the backend running?');
                } else {
                    setError(data.message || `Unable to fetch appointments (${res.status})`);
                }
                return;
            }
            setAppointments(data.appointments || []);
        } catch (err) {
            setError(err.message || 'Unable to fetch appointments');
        } finally {
            setLoadingAppts(false);
        }
    };

    // auto-fetch users when token becomes available
    useEffect(() => {
        if (adminToken) fetchUsers(adminToken);
        if (adminToken) fetchAppointments(adminToken);
        if (adminToken) fetchDoctors();
    }, [adminToken]);

    // fetch public doctors list (includes availableSlots)
    const fetchDoctors = async () => {
        setLoadingDoctors(true);
        setError('');
        try {
            // If admin is authenticated, fetch full doctor list including those without slots
            const url = adminToken ? `${API_BASE}/admin/doctors` : `${API_BASE}/doctors`;
            const headers = adminToken ? { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` } : {};
            const res = await fetch(url, { headers });
            const data = await parseResponse(res);
            if (!res.ok) {
                setError(data.message || `Unable to load doctors (${res.status})`);
                return;
            }
            setDoctors(data.doctors || []);
        } catch (err) {
            setError(err.message || 'Unable to load doctors');
        } finally {
            setLoadingDoctors(false);
        }
    };

    // logout admin: clear token and reset state
    const handleLogout = () => {
        localStorage.removeItem('adminToken');
        setAdminToken('');
        setUsers([]);
        setAppointments([]);
        setDoctors([]);
        setNotice('Logged out');
        setError('');
        // Notify other parts of the app (navbar) that admin auth state changed
        try { window.dispatchEvent(new Event('admin-auth')); } catch (e) { /* ignore */ }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setNotice('');
        if (!userId || !password) {
            setError('Please enter both user id and password.');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/admin/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, password }),
            });
            console.debug('Admin login POST', `${API_BASE}/admin/login`);
            const data = await parseResponse(res);
            if (!res.ok) {
                // common dev-proxy error text starts with "Proxy error" — provide clearer message
                const raw = (data && data._raw) || data.message || '';
                if (raw && raw.toLowerCase().includes('proxy error')) {
                    setError('Network/proxy error: unable to reach backend. Is the backend running?');
                } else {
                    setError(data.message || `Login failed (${res.status})`);
                }
                return;
            }

            // save demo token and show notice
            if (data.token) {
                localStorage.setItem('adminToken', data.token);
                setAdminToken(data.token);
                // Notify other parts of the app (navbar) that admin auth state changed
                try { window.dispatchEvent(new Event('admin-auth')); } catch (e) { /* ignore */ }
            }
            setNotice(data.message || 'Logged in');
            setUserId('');
            setPassword('');
        } catch (err) {
            setError(err.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    const handleSendReset = async (e) => {
        e.preventDefault();
        setError('');
        setNotice('');
        if (!resetId) {
            setError('Enter the user id or email to reset.');
            return;
        }
        setSendingReset(true);
        try {
            const res = await fetch(`${API_BASE}/admin/forgot`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ resetId }),
            });
            console.debug('Admin forgot POST', `${API_BASE}/admin/forgot`);
            const data = await parseResponse(res);
            if (!res.ok) {
                const raw = (data && data._raw) || data.message || '';
                if (raw && raw.toLowerCase().includes('proxy error')) {
                    setError('Network/proxy error: unable to reach backend. Is the backend running?');
                } else {
                    setError(data.message || `Unable to send reset instructions (${res.status})`);
                }
                return;
            }

            setShowForgot(false);
            setResetId('');
            setNotice(data.message || 'If an account exists for that id/email, a password reset instruction was sent.');
        } catch (err) {
            setError(err.message || 'Unable to send reset instructions.');
        } finally {
            setSendingReset(false);
        }
    };

    // create user uses same parseResponse helper
    const handleCreateUser = async (e) => {
        e.preventDefault();
        setError('');
        setNotice('');
        if (!createName || !createEmail || !createPassword) {
            setError('Please provide name, email and password for the new user.');
            return;
        }
        if (!adminToken) {
            setError('Not authenticated as admin. Please sign in first.');
            return;
        }
        setCreating(true);
        try {
            const res = await fetch(`${API_BASE}/admin/create-user`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
                body: JSON.stringify({ name: createName, email: createEmail, password: createPassword }),
            });
            console.debug('Admin create-user POST', `${API_BASE}/admin/create-user`);
            const data = await parseResponse(res);
            if (!res.ok) {
                const raw = (data && data._raw) || data.message || '';
                if (raw && raw.toLowerCase().includes('proxy error')) {
                    setError('Network/proxy error: unable to reach backend. Is the backend running?');
                } else {
                    setError(data.message || `Unable to create user (${res.status})`);
                }
                return;
            }
            setNotice(data.message || 'User created');
            setCreateName('');
            setCreateEmail('');
            setCreatePassword('');
            // refresh users list so the new user appears in the table
            try { await fetchUsers(adminToken); } catch (err) { /* ignore */ }
        } catch (err) {
            setError(err.message || 'Unable to create user');
        } finally {
            setCreating(false);
        }
    };

    // create doctor
    const handleCreateDoctor = async (e) => {
        e && e.preventDefault && e.preventDefault();
        setError('');
        setNotice('');
        if (!docName || !docSpecialty) return setError('Please provide doctor name and specialty');
        if (!adminToken) return setError('Not authenticated as admin. Please sign in first.');
        setCreatingDoctor(true);
        try {
            const body = { name: docName, specialty: docSpecialty };
            if (docId) body.id = docId;
            const res = await fetch(`${API_BASE}/admin/doctors`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
                body: JSON.stringify(body),
            });
            const data = await parseResponse(res);
            if (!res.ok) {
                const raw = (data && data._raw) || data.message || '';
                if (raw && raw.toLowerCase().includes('proxy error')) {
                    setError('Network/proxy error: unable to reach backend. Is the backend running?');
                } else {
                    setError(data.message || `Unable to create doctor (${res.status})`);
                }
                return;
            }
            setNotice(data.message || 'Doctor created');
            setDocId(''); setDocName(''); setDocSpecialty('');
            // refresh list and open the quick-schedule form for the newly created doctor
            await fetchDoctors();
            if (data.doctor && data.doctor.id) {
                setSelectedDoctorSchedule(data.doctor.id);
                // initialize inputs
                setSlotDatetime(prev => ({ ...prev, [data.doctor.id]: '' }));
                setSlotPlace(prev => ({ ...prev, [data.doctor.id]: '' }));
            }
        } catch (err) {
            setError(err.message || 'Unable to create doctor');
        } finally {
            setCreatingDoctor(false);
        }
    };

    const handleApprove = async (id) => {
        if (!adminToken) return setError('Not authenticated');
        setError('');
        try {
            const res = await fetch(`${API_BASE}/admin/appointments/${id}/approve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
            });
            const data = await parseResponse(res);
            if (!res.ok) return setError(data.message || `Unable to approve (${res.status})`);
            setNotice(data.message || 'Appointment approved');
            await fetchAppointments(adminToken);
        } catch (err) {
            setError(err.message || 'Unable to approve');
        }
    };

    const handleReject = async (id) => {
        if (!adminToken) return setError('Not authenticated');
        const reason = window.prompt('Rejection reason (optional):', '');
        setError('');
        try {
            const res = await fetch(`${API_BASE}/admin/appointments/${id}/reject`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
                body: JSON.stringify({ reason }),
            });
            const data = await parseResponse(res);
            if (!res.ok) return setError(data.message || `Unable to reject (${res.status})`);
            setNotice(data.message || 'Appointment rejected');
            await fetchAppointments(adminToken);
        } catch (err) {
            setError(err.message || 'Unable to reject');
        }
    };

    // Report helper variables and CSV/PDF download functions removed (unused in this component).
    // If reports functionality is needed here later, reintroduce or move to the Reports page.

    const uploadAttachment = async (apptId, file) => {
        if (!adminToken) return setError('Not authenticated');
        if (!file) return setError('No file selected');
        setError('');
        setNotice('');
        setUploadingId(apptId);
        try {
            const fd = new FormData();
            // support single File or FileList/array
            if (file instanceof File) {
                fd.append('files', file);
            } else if (file instanceof FileList || Array.isArray(file)) {
                Array.from(file).forEach((f) => fd.append('files', f));
            }
            const res = await fetch(`${API_BASE}/admin/appointments/${apptId}/upload`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${adminToken}` },
                body: fd,
            });
            const text = await res.text();
            let data;
            try { data = JSON.parse(text); } catch (e) { data = { message: text }; }
            if (!res.ok) return setError(data.message || `Upload failed (${res.status})`);
            setNotice(data.message || 'Uploaded');
            // refresh appointments
            await fetchAppointments(adminToken);
        } catch (err) {
            setError(err.message || 'Upload failed');
        } finally {
            setUploadingId(null);
        }
    };

    const deleteAttachment = async (apptId, filename) => {
        if (!adminToken) return setError('Not authenticated');
        if (!window.confirm('Delete this attachment?')) return;
        setError('');
        setNotice('');
        try {
            const res = await fetch(`${API_BASE}/admin/appointments/${apptId}/attachments/${encodeURIComponent(filename)}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
            });
            const data = await (async () => { try { return await res.json(); } catch (e) { return { message: await res.text() }; } })();
            if (!res.ok) return setError(data.message || `Delete failed (${res.status})`);
            setNotice(data.message || 'Attachment deleted');
            await fetchAppointments(adminToken);
        } catch (err) {
            setError(err.message || 'Delete failed');
        }
    };

    // Add an availability slot for a doctor (admin)
    const handleAddAvailability = async (doctorId) => {
        if (!adminToken) return setError('Not authenticated');
        setError('');
        setNotice('');
        const datetime = (slotDatetime && slotDatetime[doctorId]) || '';
        const place = (slotPlace && slotPlace[doctorId]) || '';
        if (!datetime) return setError('Select a date & time to add');
        try {
            const res = await fetch(`${API_BASE}/admin/doctors/${encodeURIComponent(doctorId)}/availability`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
                body: JSON.stringify({ datetime, place }),
            });
            const data = await parseResponse(res);
            if (!res.ok) return setError(data.message || `Unable to add slot (${res.status})`);
            setNotice(data.message || 'Slot added');
            setSlotDatetime(prev => ({ ...prev, [doctorId]: '' }));
            setSlotPlace(prev => ({ ...prev, [doctorId]: '' }));
            // if this was the quick-schedule for a created doctor, clear the selection
            if (selectedDoctorSchedule === doctorId) setSelectedDoctorSchedule('');
            await fetchDoctors();
            await fetchAppointments(adminToken);
        } catch (err) {
            setError(err.message || 'Unable to add slot');
        }
    };

    // Remove an availability slot (admin)
    const handleRemoveAvailability = async (doctorId, datetime) => {
        if (!adminToken) return setError('Not authenticated');
        if (!window.confirm('Remove this availability slot?')) return;
        setError('');
        setNotice('');
        try {
            const res = await fetch(`${API_BASE}/admin/doctors/${encodeURIComponent(doctorId)}/availability`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
                body: JSON.stringify({ datetime }),
            });
            const data = await parseResponse(res);
            if (!res.ok) return setError(data.message || `Unable to remove slot (${res.status})`);
            setNotice(data.message || 'Slot removed');
            await fetchDoctors();
            await fetchAppointments(adminToken);
        } catch (err) {
            setError(err.message || 'Unable to remove slot');
        }
    };

    return (
        <div className="" style={{backgroundColor: '#00ffbf',}}>
            <div className="admin-container">
                <h2>Admin</h2>

                {notice && <div className="notice" role="status">{notice}</div>}
                {error && <div className="error" role="alert">{error}</div>}
                {isProdNoApi && (
                    <div className="error" role="alert" style={{ marginBottom: 12 }}>
                        This site was built without a backend URL. GitHub Pages (and other static hosts) cannot handle API POST requests at <code>/api</code>.
                        Build the frontend with REACT_APP_API_BASE set to your deployed backend (for example:
                        <code>REACT_APP_API_BASE=https://my-backend.example.com/api</code>) and redeploy the site.
                    </div>
                )}

                {!adminToken ? (
                    <>
                        <form className="admin-form" onSubmit={handleSubmit} aria-label="Admin login form">
                            <label htmlFor="admin-user">User id or email</label>
                            <input
                                id="admin-user"
                                name="user"
                                type="text"
                                value={userId}
                                onChange={(e) => setUserId(e.target.value)}
                                autoComplete="username"
                            />

                            <label htmlFor="admin-pass">Password</label>
                            <input
                                id="admin-pass"
                                name="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                autoComplete="current-password"
                            />

                            <div className="form-row">
                                <button type="submit" className="btn-primary" disabled={loading}>
                                    {loading ? 'Signing in...' : 'Sign in'}
                                </button>

                                <button
                                    type="button"
                                    className="forgot-link"
                                    onClick={() => { setShowForgot(true); setError(''); }}
                                >
                                    Forgot password?
                                </button>
                            </div>

                            <p className="form-help">This page sends requests to the backend. Use demo credentials in development (admin / admin123).</p>
                        </form>

                        {showForgot && (
                            <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Forgot password dialog">
                                <div className="modal">
                                    <h3>Reset password</h3>
                                    <p>Enter the user id or email for the admin account.</p>
                                    <form onSubmit={handleSendReset}>
                                        <label htmlFor="reset-id">User id or email</label>
                                        <input
                                            id="reset-id"
                                            type="text"
                                            value={resetId}
                                            onChange={(e) => setResetId(e.target.value)}
                                        />

                                        <div className="form-row">
                                            <button type="submit" className="btn-primary" disabled={sendingReset}>
                                                {sendingReset ? 'Sending...' : 'Send reset'}
                                            </button>
                                            <button type="button" className="btn-muted" onClick={() => setShowForgot(false)}>
                                                Cancel
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="admin-panel">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <strong>Authenticated as admin</strong>
                            <div>
                                <button className="btn-muted" onClick={handleLogout}>Logout</button>
                            </div>
                        </div>

                        <hr style={{ margin: '12px 0' }} />

                        <h3>Create new user</h3>
                        <form onSubmit={handleCreateUser} className="admin-form" aria-label="Create user form">
                            <label htmlFor="create-name">Full name</label>
                            <input id="create-name" value={createName} onChange={(e) => setCreateName(e.target.value)} />

                            <label htmlFor="create-email">Email</label>
                            <input id="create-email" type="email" value={createEmail} onChange={(e) => setCreateEmail(e.target.value)} />

                            <label htmlFor="create-pass">Password</label>
                            <input id="create-pass" type="password" value={createPassword} onChange={(e) => setCreatePassword(e.target.value)} />

                            <div className="form-row">
                                <button type="submit" className="btn-primary" disabled={creating}>{creating ? 'Creating...' : 'Create user'}</button>
                            </div>
                        </form>

                        <hr style={{ margin: '14px 0' }} />

                        <h3>Users</h3>
                        {users.length === 0 ? (
                            <p style={{ color: '#586069' }}>No users yet.</p>
                        ) : (
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                <tr>
                                    <th style={{ textAlign: 'left', padding: '6px 8px' }}>ID</th>
                                    <th style={{ textAlign: 'left', padding: '6px 8px' }}>Name</th>
                                    <th style={{ textAlign: 'left', padding: '6px 8px' }}>Email</th>
                                </tr>
                                </thead>
                                <tbody>
                                {users.map((u) => (
                                    <tr key={u.id}>
                                        <td style={{ padding: '6px 8px', borderTop: '1px solid #eee' }}>{u.id}</td>
                                        <td style={{ padding: '6px 8px', borderTop: '1px solid #eee' }}>{u.name}</td>
                                        <td style={{ padding: '6px 8px', borderTop: '1px solid #eee' }}>{u.email}</td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        )}

                        <hr style={{ margin: '14px 0' }} />

                        <h3>Appointments</h3>
                        {loadingAppts ? (
                            <p>Loading appointments...</p>
                        ) : appointments.length === 0 ? (
                            <p style={{ color: '#586069' }}>No appointments found.</p>
                        ) : (
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                <tr>
                                    <th style={{ textAlign: 'left', padding: '6px 8px' }}>ID</th>
                                    <th style={{ textAlign: 'left', padding: '6px 8px' }}>User</th>
                                    <th style={{ textAlign: 'left', padding: '6px 8px' }}>Doctor</th>
                                    <th style={{ textAlign: 'left', padding: '6px 8px' }}>Status</th>
                                    <th style={{ textAlign: 'left', padding: '6px 8px' }}>Actions</th>
                                </tr>
                                </thead>
                                <tbody>
                                {appointments.map((a) => (
                                    <tr key={a.id}>
                                        <td style={{ padding: '6px 8px', borderTop: '1px solid #eee' }}>{a.id}</td>
                                        <td style={{ padding: '6px 8px', borderTop: '1px solid #eee' }}>{a.user ? `${a.user.name} (${a.user.email})` : a.userId}</td>
                                        <td style={{ padding: '6px 8px', borderTop: '1px solid #eee' }}>{a.doctor ? `${a.doctor.name} — ${a.doctor.specialty}` : a.doctorId}</td>
                                        <td style={{ padding: '6px 8px', borderTop: '1px solid #eee' }}>{a.status}{a.rejectionReason ? ` — ${a.rejectionReason}` : ''}</td>
                                        <td style={{ padding: '6px 8px', borderTop: '1px solid #eee' }}>
                                            {a.status === 'requested' && (
                                                <>
                                                    <button
                                                        className="btn-primary"
                                                        onClick={() => handleApprove(a.id)}
                                                        style={{ marginRight: '8px' }}
                                                    >
                                                        Approve
                                                    </button>
                                                    <button
                                                        className="btn-muted"
                                                        onClick={() => handleReject(a.id)}
                                                    >
                                                        Reject
                                                    </button>
                                                </>
                                            )}
                                            {/* Upload control */}
                                            <div style={{ marginTop: 8 }}>
                                                <input
                                                    id={`file-${a.id}`}
                                                    type="file"
                                                    accept="application/pdf,image/jpeg"
                                                    multiple
                                                    style={{ display: 'none' }}
                                                    onChange={(e) => {
                                                        const files = e.target.files;
                                                        if (files && files.length > 0) uploadAttachment(a.id, files);
                                                        e.target.value = '';
                                                    }}
                                                />
                                                <button
                                                    className="btn-muted"
                                                    onClick={() => document.getElementById(`file-${a.id}`).click()}
                                                    disabled={uploadingId === a.id}
                                                    style={{ marginRight: 8 }}
                                                >
                                                    {uploadingId === a.id ? 'Uploading…' : 'Upload PDF/JPG'}
                                                </button>
                                                {a.attachments && a.attachments.length > 0 && (
                                                    <div style={{ marginTop: 6 }}>
                                                        {a.attachments.map((att, idx) => (
                                                            <div key={idx} style={{ display: 'inline-flex', alignItems: 'center', marginRight: 8 }}>
                                                                <a
                                                                    href={(att.url && (att.url.startsWith('http') ? att.url : `${backendBase}${att.url}`)) || '#'}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    style={{ marginRight: 6 }}
                                                                >
                                                                    {att.originalname || att.filename}
                                                                </a>
                                                                <button
                                                                    className="btn-muted"
                                                                    onClick={() => deleteAttachment(a.id, att.filename)}
                                                                    style={{ fontSize: 12, padding: '4px 6px' }}
                                                                >
                                                                    Delete
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        )}

                        <hr style={{ margin: '14px 0' }} />

                        <h3>Doctors & Availability</h3>
                        <form onSubmit={handleCreateDoctor} className="admin-form" style={{ marginBottom: 12 }} aria-label="Create doctor form">
                            <label htmlFor="doc-id">Doctor id (optional)</label>
                            <input id="doc-id" value={docId} onChange={(e) => setDocId(e.target.value)} placeholder="e.g. doc4" />

                            <label htmlFor="doc-name">Full name</label>
                            <input id="doc-name" value={docName} onChange={(e) => setDocName(e.target.value)} />

                            <label htmlFor="doc-specialty">Specialty</label>
                            <input id="doc-specialty" value={docSpecialty} onChange={(e) => setDocSpecialty(e.target.value)} />

                            <div className="form-row">
                                <button type="submit" className="btn-primary" disabled={creatingDoctor}>{creatingDoctor ? 'Creating...' : 'Create doctor'}</button>
                            </div>
                        </form>

                        {/* Quick-schedule form shown after creating a doctor */}
                        {selectedDoctorSchedule && (
                            <div style={{ border: '1px solid #e6e6e6', padding: 12, marginBottom: 12 }}>
                                <h4>Schedule for newly created doctor</h4>
                                <p style={{ marginTop: 0 }}>Doctor id: <strong>{selectedDoctorSchedule}</strong></p>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                                    <label style={{ display: 'block' }}>Place</label>
                                    <input value={slotPlace[selectedDoctorSchedule] || ''} onChange={(e) => setSlotPlace(prev => ({ ...prev, [selectedDoctorSchedule]: e.target.value }))} placeholder="Room / Clinic" />
                                    <label style={{ display: 'block' }}>Date & time</label>
                                    <input type="datetime-local" value={slotDatetime[selectedDoctorSchedule] || ''} onChange={(e) => setSlotDatetime(prev => ({ ...prev, [selectedDoctorSchedule]: e.target.value }))} />
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <button className="btn-primary" onClick={() => handleAddAvailability(selectedDoctorSchedule)}>Schedule</button>
                                        <button className="btn-muted" onClick={() => setSelectedDoctorSchedule('')}>Cancel</button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {loadingDoctors ? (
                            <p>Loading doctors...</p>
                        ) : doctors.length === 0 ? (
                            <p style={{ color: '#586069' }}>No doctors found.</p>
                        ) : (
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr>
                                        <th style={{ textAlign: 'left', padding: '6px 8px' }}>ID</th>
                                        <th style={{ textAlign: 'left', padding: '6px 8px' }}>Doctor</th>
                                        <th style={{ textAlign: 'left', padding: '6px 8px' }}>Available slots</th>
                                        <th style={{ textAlign: 'left', padding: '6px 8px' }}>Add slot</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {doctors.map((d) => (
                                        <tr key={d.id}>
                                            <td style={{ padding: '6px 8px', borderTop: '1px solid #eee' }}>{d.id}</td>
                                            <td style={{ padding: '6px 8px', borderTop: '1px solid #eee' }}>{`${d.name} — ${d.specialty}`}</td>
                                            <td style={{ padding: '6px 8px', borderTop: '1px solid #eee' }}>
                                                {d.availableSlots && d.availableSlots.length > 0 ? (
                                                    <div>
                                                        {d.availableSlots.map((s, idx) => (
                                                            <div key={idx} style={{ marginBottom: 6, display: 'flex', alignItems: 'center' }}>
                                                                <span style={{ marginRight: 8 }}>{new Date(s).toLocaleString()}</span>
                                                                <button className="btn-muted" onClick={() => handleRemoveAvailability(d.id, s)} style={{ fontSize: 12, padding: '4px 6px' }}>
                                                                    Remove
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span style={{ color: '#586069' }}>—</span>
                                                )}
                                            </td>
                                            <td style={{ padding: '6px 8px', borderTop: '1px solid #eee' }}>
                                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                                    <input
                                                        type="text"
                                                        placeholder="Place (room/clinic)"
                                                        value={slotPlace[d.id] || ''}
                                                        onChange={(e) => setSlotPlace(prev => ({ ...prev, [d.id]: e.target.value }))}
                                                        aria-label={`Place for ${d.name}`}
                                                        style={{ minWidth: 160 }}
                                                    />
                                                    <input
                                                        type="datetime-local"
                                                        value={slotDatetime[d.id] || ''}
                                                        onChange={(e) => setSlotDatetime(prev => ({ ...prev, [d.id]: e.target.value }))}
                                                        aria-label={`Add slot for ${d.name}`}
                                                    />
                                                    <button className="btn-primary" onClick={() => handleAddAvailability(d.id)}>
                                                        Add
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}

                        <hr style={{ margin: '14px 0' }} />
                        <h3>Reports</h3>
                        <p style={{ color: '#586069' }}>Open the dedicated Reports page to view and download reports.</p>
                        <div style={{ marginBottom: 10 }}>
                            <a href="/reports" className="btn-primary" style={{ padding: '6px 12px', textDecoration: 'none' }}>Open Reports</a>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

