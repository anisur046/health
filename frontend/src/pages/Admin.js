import React, { useState, useEffect } from 'react';
import Footer from '../Footer';
import { API_BASE } from '../config';

export default function Admin() {

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
    const [adminToken, setAdminToken] = useState(() => sessionStorage.getItem('adminToken') || '');

    // Create user fields (admin-only)
    const [createName, setCreateName] = useState('')
    const [createEmail, setCreateEmail] = useState('');
    const [createPassword, setCreatePassword] = useState('');
    const [creating, setCreating] = useState(false);
    // admin users list


    // logout admin: clear token and reset state
    const handleLogout = () => {
        sessionStorage.removeItem('adminToken');
        setAdminToken('');
        setAdminToken('');
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
                sessionStorage.setItem('adminToken', data.token);
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

        } catch (err) {
            setError(err.message || 'Unable to create user');
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="page-with-bg page-with-bg--admin">
            <div className="admin-container">
                <h2>Admin Dashboard</h2>

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

                        <div className="admin-welcome" style={{ marginTop: 20, marginBottom: 20 }}>
                            <p>Use the navigation menu to access management sections:</p>
                            <ul style={{ lineHeight: 1.8 }}>
                                <li><strong>Doctor Availability:</strong> Manage doctors and their available slots.</li>
                                <li><strong>Time Schedule:</strong> View, approve, or reject appointment requests.</li>
                            </ul>
                        </div>

                        <hr style={{ margin: '12px 0' }} />

                        <h3>Create new Admin</h3>
                        <p style={{ fontSize: '0.9em', color: '#666' }}>Note: This will create a new Administrator account, not a Citizen.</p>
                        <form onSubmit={handleCreateUser} className="admin-form" aria-label="Create user form">
                            <label htmlFor="create-name">Full name</label>
                            <input id="create-name" value={createName} onChange={(e) => setCreateName(e.target.value)} />

                            <label htmlFor="create-email">Email</label>
                            <input id="create-email" type="email" value={createEmail} onChange={(e) => setCreateEmail(e.target.value)} />

                            <label htmlFor="create-pass">Password</label>
                            <input id="create-pass" type="password" value={createPassword} onChange={(e) => setCreatePassword(e.target.value)} />

                            <div className="form-row">
                                <button type="submit" className="btn-primary" disabled={creating}>{creating ? 'Creating...' : 'Create Admin'}</button>
                            </div>
                        </form>


                    </div>
                )}
            </div>
            <Footer />
        </div>
    );
}
