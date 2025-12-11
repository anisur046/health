import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const DEFAULT_DEV_BACKEND = 'http://127.0.0.1:3001/api';

export default function AdminAppointments() {
    const navigate = useNavigate();
    const API_BASE = process.env.REACT_APP_API_BASE || (process.env.NODE_ENV === 'development' ? DEFAULT_DEV_BACKEND : '/api');
    const backendBase = API_BASE && API_BASE.startsWith('http') ? API_BASE.replace(/\/api$/, '') : '';

    // Auth
    const [adminToken, setAdminToken] = useState(() => localStorage.getItem('adminToken') || '');

    // State
    const [appointments, setAppointments] = useState([]);
    const [loadingAppts, setLoadingAppts] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [uploadingId, setUploadingId] = useState(null);

    useEffect(() => {
        if (!adminToken) {
            navigate('/admin');
        } else {
            fetchAppointments();
        }
    }, [adminToken, navigate]);

    const parseResponse = async (res) => {
        const text = await res.text();
        try { return JSON.parse(text); } catch (err) { return { message: text }; }
    };

    const fetchAppointments = async () => {
        setLoadingAppts(true);
        try {
            const res = await fetch(`${API_BASE}/admin/appointments`, {
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
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

    const handleApprove = async (id) => {
        setError('');
        try {
            const res = await fetch(`${API_BASE}/admin/appointments/${id}/approve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
            });
            const data = await parseResponse(res);
            if (!res.ok) return setError(data.message || `Unable to approve (${res.status})`);
            setNotice(data.message || 'Appointment approved');
            await fetchAppointments();
        } catch (err) {
            setError(err.message || 'Unable to approve');
        }
    };

    const handleReject = async (id) => {
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
            await fetchAppointments();
        } catch (err) {
            setError(err.message || 'Unable to reject');
        }
    };

    const uploadAttachment = async (apptId, file) => {
        if (!file) return setError('No file selected');
        setError('');
        setNotice('');
        setUploadingId(apptId);
        try {
            const fd = new FormData();
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
            const data = await parseResponse(res);
            if (!res.ok) return setError(data.message || `Upload failed (${res.status})`);
            setNotice(data.message || 'Uploaded');
            await fetchAppointments();
        } catch (err) {
            setError(err.message || 'Upload failed');
        } finally {
            setUploadingId(null);
        }
    };

    const deleteAttachment = async (apptId, filename) => {
        if (!window.confirm('Delete this attachment?')) return;
        setError('');
        setNotice('');
        try {
            const res = await fetch(`${API_BASE}/admin/appointments/${apptId}/attachments/${encodeURIComponent(filename)}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
            });
            const data = await parseResponse(res);
            if (!res.ok) return setError(data.message || `Delete failed (${res.status})`);
            setNotice(data.message || 'Attachment deleted');
            await fetchAppointments();
        } catch (err) {
            setError(err.message || 'Delete failed');
        }
    };

    return (
        <div className="" style={{ backgroundColor: '#00ffbf' }}>
            <div className="admin-container">
                <h2>Time Schedule (Appointments)</h2>

                {notice && <div className="notice" role="status">{notice}</div>}
                {error && <div className="error" role="alert">{error}</div>}

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
            </div>
        </div>
    );
}
