import React, { useState, useEffect } from 'react';

// Prefer REACT_APP_API_BASE when provided. In development default to localhost:3001
// to avoid proxy/misrouting issues (restart CRA after changing package.json/.env).
const DEFAULT_DEV_BACKEND = 'http://localhost:3001/api';
export default function Admin() {
    const API_BASE = process.env.REACT_APP_API_BASE || (process.env.NODE_ENV === 'development' ? DEFAULT_DEV_BACKEND : '/api');

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
    }, [adminToken]);

    // logout admin: clear token and reset state
    const handleLogout = () => {
        localStorage.removeItem('adminToken');
        setAdminToken('');
        setUsers([]);
        setAppointments([]);
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

    return (
        <div className="" style={{backgroundColor: '#00ffbf',}}>
            <div className="admin-container">
                <h2>Admin</h2>

                {notice && <div className="notice" role="status">{notice}</div>}
                {error && <div className="error" role="alert">{error}</div>}

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