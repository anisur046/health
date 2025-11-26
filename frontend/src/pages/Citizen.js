import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function Citizen() {
  // Use explicit REACT_APP_API_BASE when provided. In development default to localhost:3001
  // to avoid proxy/misrouting issues (restart CRA after changing package.json/.env).
  const DEFAULT_DEV_BACKEND = 'http://localhost:3001/api';
  const API_BASE = process.env.REACT_APP_API_BASE || (process.env.NODE_ENV === 'development' ? DEFAULT_DEV_BACKEND : '/api');

  // helper: safely parse JSON responses and return raw text if parsing fails
  const parseResponse = async (res) => {
    const text = await res.text();
    if (!text) return {};
    try {
      return JSON.parse(text);
    } catch (err) {
      // Log raw response to aid debugging proxy/html errors
      console.error('parseResponse: non-JSON response', text.substring(0, 100));
      return { message: text, _raw: text };
    }
  };

  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [sending, setSending] = useState(false);

  // authenticated citizen state
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem('citizenUser');
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  });

  const clearForm = () => {
    setName('');
    setEmail('');
    setPassword('');
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');
    if (!name || !email || !password) {
      setError('Please fill name, email and password.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/citizen/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await parseResponse(res);
      if (!res.ok) {
        const raw = (data && data._raw) || data.message || '';
        if (raw && raw.toLowerCase().includes('proxy error')) {
          setError('Network/proxy error: unable to reach backend. Is the backend running?');
        } else {
          setError(data.message || `Registration failed (${res.status})`);
        }
        return;
      }

      if (data.token) localStorage.setItem('citizenToken', data.token);
      if (data.user) {
        localStorage.setItem('citizenUser', JSON.stringify(data.user));
        setUser(data.user);
      }
      setNotice(data.message || 'Registered');
      clearForm();
      setMode('login');
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');
    if (!email || !password) {
      setError('Please enter email and password.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/citizen/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await parseResponse(res);
      if (!res.ok) {
        const raw = (data && data._raw) || data.message || '';
        if (raw && raw.toLowerCase().includes('proxy error')) {
          setError('Network/proxy error: unable to reach backend. Is the backend running?');
        } else {
          setError(data.message || `Login failed (${res.status})`);
        }
        return;
      }

      if (data.token) localStorage.setItem('citizenToken', data.token);
      if (data.user) {
        localStorage.setItem('citizenUser', JSON.stringify(data.user));
        setUser(data.user);
      }
      setNotice(data.message || 'Logged in');
      clearForm();
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');
    if (!forgotEmail) {
      setError('Enter the email to reset.');
      return;
    }
    setSending(true);
    try {
      const res = await fetch(`${API_BASE}/citizen/forgot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
      });
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
      setForgotEmail('');
      setNotice(data.message || 'If an account exists for that email, reset instructions were sent.');
    } catch (err) {
      setError(err.message || 'Unable to send reset instructions.');
    } finally {
      setSending(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('citizenToken');
    localStorage.removeItem('citizenUser');
    setUser(null);
    setNotice('Logged out');
    setError('');
    setMode('login');
  };

  return (
    <div className="citizen-container">
      <h2>Citizen Portal</h2>

      {notice && <div className="notice" role="status">{notice}</div>}
      {error && <div className="error" role="alert">{error}</div>}

      {user ? (
        <div className="citizen-panel">
          <p>Signed in as <strong>{user.name}</strong> ({user.email})</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link className="cta" to="/citizen/appointments">Request Appointment</Link>
            <button className="btn-muted" onClick={handleLogout}>Logout</button>
          </div>
        </div>
      ) : (
      <>
      <div className="mode-toggle">
        <button
          className={mode === 'login' ? 'btn-primary' : 'btn-muted'}
          onClick={() => { setMode('login'); setError(''); setNotice(''); }}
        >
          Login
        </button>
        <button
          className={mode === 'register' ? 'btn-primary' : 'btn-muted'}
          onClick={() => { setMode('register'); setError(''); setNotice(''); }}
        >
          Register
        </button>
      </div>

      {mode === 'register' ? (
        <form className="citizen-form" onSubmit={handleRegister} aria-label="Citizen register form">
          <label htmlFor="citizen-name">Full name</label>
          <input id="citizen-name" value={name} onChange={(e) => setName(e.target.value)} />

          <label htmlFor="citizen-email">Email</label>
          <input id="citizen-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />

          <label htmlFor="citizen-pass">Password</label>
          <input id="citizen-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />

          <div className="form-row">
            <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Registering...' : 'Create account'}</button>
            <button type="button" className="btn-muted" onClick={() => { setMode('login'); setError(''); }}>{'Back to login'}</button>
          </div>
        </form>
      ) : (
        <form className="citizen-form" onSubmit={handleLogin} aria-label="Citizen login form">
          <label htmlFor="login-email">Email</label>
          <input id="login-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />

          <label htmlFor="login-pass">Password</label>
          <input id="login-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />

          <div className="form-row">
            <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Signing in...' : 'Sign in'}</button>
            <button type="button" className="forgot-link" onClick={() => { setShowForgot(true); setError(''); }}>
              Forgot password?
            </button>
          </div>
        </form>
      )}

      {showForgot && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Forgot password dialog">
          <div className="modal">
            <h3>Reset password</h3>
            <p>Enter your email and we'll send reset instructions if the account exists.</p>
            <form onSubmit={handleForgot}>
              <label htmlFor="forgot-email">Email</label>
              <input id="forgot-email" type="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} />

              <div className="form-row">
                <button type="submit" className="btn-primary" disabled={sending}>{sending ? 'Sending...' : 'Send reset'}</button>
                <button type="button" className="btn-muted" onClick={() => setShowForgot(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
      </>
      )}

      <p className="form-help">Registered users can sign in and manage appointments. Demo accounts are stored in the local backend for development.</p>
    </div>
  );
}
