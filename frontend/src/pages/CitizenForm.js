// filepath: c:\Users\HP\WebstormProjects\health\frontend\src\pages\CitizenForm.js
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

export default function CitizenForm() {
  const API_BASE = process.env.REACT_APP_API_BASE || '/api';
  // base for serving uploaded files: if API_BASE is absolute use that without `/api`, otherwise use relative path
  const backendBase = API_BASE && API_BASE.startsWith('http') ? API_BASE.replace(/\/api$/, '') : '';

  const [doctors, setDoctors] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [doctorId, setDoctorId] = useState('');
  const [datetime, setDatetime] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [appointments, setAppointments] = useState([]);
  const [loadingAppts, setLoadingAppts] = useState(false);

  const token = typeof window !== 'undefined' ? localStorage.getItem('citizenToken') : null;

  const parseResponse = async (res) => {
    const text = await res.text();
    if (!text) return {};
    try {
      return JSON.parse(text);
    } catch (err) {
      return { message: text, _raw: text };
    }
  };

  const fetchDoctors = async () => {
    setLoadingDoctors(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/doctors`);
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

  const fetchAppointments = async () => {
    if (!token) return;
    setLoadingAppts(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/citizen/appointments`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const data = await parseResponse(res);
      if (!res.ok) {
        setError(data.message || `Unable to fetch appointments (${res.status})`);
        return;
      }
      setAppointments(data.appointments || []);
    } catch (err) {
      setError(err.message || 'Unable to fetch appointments');
    } finally {
      setLoadingAppts(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
    if (token) fetchAppointments();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');
    if (!token) {
      setError('You must be logged in as a citizen to request an appointment.');
      return;
    }
    if (!doctorId || !datetime) {
      setError('Please select a doctor and date/time.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/citizen/appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ doctorId, datetime, reason }),
      });
      const data = await parseResponse(res);
      if (!res.ok) {
        setError(data.message || `Unable to request appointment (${res.status})`);
        return;
      }
      setNotice(data.message || 'Appointment requested');
      setDoctorId('');
      setDatetime('');
      setReason('');
      // refresh appointments
      await fetchAppointments();
    } catch (err) {
      setError(err.message || 'Unable to request appointment');
    } finally {
      setSubmitting(false);
    }
  };

  if (!token) {
    return (
      <div className="page-with-bg page-with-bg--appointment">
        <div className="citizen-container">
          <h2>Request an Appointment</h2>
          <p>You must be logged in to request an appointment.</p>
          <p>
            <Link to="/citizen">Go to Citizen login/register</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-with-bg page-with-bg--appointment">
      <div className="citizen-container">
        <h2>Request an Appointment</h2>

        {notice && <div className="notice" role="status">{notice}</div>}
        {error && <div className="error" role="alert">{error}</div>}

        <form onSubmit={handleSubmit} className="citizen-form" aria-label="Appointment form">
          <label htmlFor="doctor">Doctor</label>
          <select id="doctor" value={doctorId} onChange={(e) => setDoctorId(e.target.value)}>
            <option value="">{loadingDoctors ? 'Loading doctors...' : 'Select a doctor'}</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>{`${d.name} — ${d.specialty}`}</option>
            ))}
          </select>

          <label htmlFor="datetime">Date & time</label>
          <input id="datetime" type="datetime-local" value={datetime} onChange={(e) => setDatetime(e.target.value)} />

          <label htmlFor="reason">Reason (optional)</label>
          <input id="reason" value={reason} onChange={(e) => setReason(e.target.value)} />

          <div className="form-row" style={{ marginTop: 12 }}>
            <button className="btn-primary" type="submit" disabled={submitting}>{submitting ? 'Requesting...' : 'Request appointment'}</button>
          </div>
        </form>

        <hr style={{ margin: '14px 0' }} />

        <h3>Your appointments</h3>
        {loadingAppts ? (
          <p>Loading appointments...</p>
        ) : appointments.length === 0 ? (
          <p style={{ color: '#586069' }}>No appointments yet.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '6px 8px' }}>ID</th>
                <th style={{ textAlign: 'left', padding: '6px 8px' }}>Doctor</th>
                <th style={{ textAlign: 'left', padding: '6px 8px' }}>Date / Time</th>
                <th style={{ textAlign: 'left', padding: '6px 8px' }}>Reason</th>
                <th style={{ textAlign: 'left', padding: '6px 8px' }}>Status</th>
                <th style={{ textAlign: 'left', padding: '6px 8px' }}>Attachments</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((a) => {
                const doc = doctors.find((d) => d.id === a.doctorId) || {};
                return (
                  <tr key={a.id}>
                    <td style={{ padding: '6px 8px', borderTop: '1px solid #eee' }}>{a.id}</td>
                    <td style={{ padding: '6px 8px', borderTop: '1px solid #eee' }}>{doc.name || a.doctorId}</td>
                    <td style={{ padding: '6px 8px', borderTop: '1px solid #eee' }}>{a.datetime}</td>
                    <td style={{ padding: '6px 8px', borderTop: '1px solid #eee' }}>{a.reason}</td>
                    <td style={{ padding: '6px 8px', borderTop: '1px solid #eee' }}>{a.status}</td>
                    <td style={{ padding: '6px 8px', borderTop: '1px solid #eee' }}>
                      {a.attachments && a.attachments.length > 0 ? (
                        <div>
                          {a.attachments.map((att, idx) => (
                            <div key={idx} style={{ marginBottom: 6 }}>
                              <a
                                href={(att.url && (att.url.startsWith('http') ? att.url : `${backendBase}${att.url}`)) || '#'}
                                target="_blank"
                                rel="noreferrer"
                                style={{ marginRight: 8 }}
                              >
                                {att.originalname || att.filename}
                              </a>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span style={{ color: '#586069' }}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
