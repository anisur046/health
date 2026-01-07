import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Footer from '../Footer';
import { API_BASE } from '../config';

export default function AdminDoctors() {
    const navigate = useNavigate();

    // Auth State
    const [adminToken, setAdminToken] = useState(() => localStorage.getItem('adminToken') || '');

    // Doctors State
    const [doctors, setDoctors] = useState([]);
    const [loadingDoctors, setLoadingDoctors] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');

    // Create Doctor Fields
    const [docId, setDocId] = useState('');
    const [docName, setDocName] = useState('');
    const [docSpecialty, setDocSpecialty] = useState('');
    const [creatingDoctor, setCreatingDoctor] = useState(false);

    // Availability Inputs
    const [slotDatetime, setSlotDatetime] = useState({});
    const [slotPlace, setSlotPlace] = useState({});
    const [selectedDoctorSchedule, setSelectedDoctorSchedule] = useState('');

    useEffect(() => {
        if (!adminToken) {
            navigate('/admin'); // Redirect to login if not authenticated
        } else {
            fetchDoctors();
        }
    }, [adminToken, navigate]);

    const parseResponse = async (res) => {
        const text = await res.text();
        try { return JSON.parse(text); } catch (err) { return { message: text }; }
    };

    const fetchDoctors = async () => {
        setLoadingDoctors(true);
        setError('');
        try {
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

    const handleCreateDoctor = async (e) => {
        e && e.preventDefault();
        setError('');
        setNotice('');
        if (!docName || !docSpecialty) return setError('Please provide doctor name and specialty');

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
                setError(data.message || `Unable to create doctor (${res.status})`);
                return;
            }
            setNotice(data.message || 'Doctor created');
            setDocId(''); setDocName(''); setDocSpecialty('');
            await fetchDoctors();

            if (data.doctor && data.doctor.id) {
                setSelectedDoctorSchedule(data.doctor.id);
                setSlotDatetime(prev => ({ ...prev, [data.doctor.id]: '' }));
                setSlotPlace(prev => ({ ...prev, [data.doctor.id]: '' }));
            }
        } catch (err) {
            setError(err.message || 'Unable to create doctor');
        } finally {
            setCreatingDoctor(false);
        }
    };

    const handleAddAvailability = async (doctorId) => {
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
            if (selectedDoctorSchedule === doctorId) setSelectedDoctorSchedule('');
            await fetchDoctors();
        } catch (err) {
            setError(err.message || 'Unable to add slot');
        }
    };

    const handleRemoveAvailability = async (doctorId, datetime) => {
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
        } catch (err) {
            setError(err.message || 'Unable to remove slot');
        }
    };

    return (
        <div className="" style={{ backgroundColor: '#00ffbf' }}>
            <div className="admin-container">
                <h2>Doctor Availability</h2>

                {notice && <div className="notice" role="status">{notice}</div>}
                {error && <div className="error" role="alert">{error}</div>}

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
                                                aria-label={`Datetime for ${d.name}`}
                                                style={{ minWidth: 200 }}
                                            />
                                            <button
                                                className="btn-primary"
                                                onClick={() => handleAddAvailability(d.id)}
                                                style={{ whiteSpace: 'nowrap' }}
                                            >
                                                Add
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
            <Footer />
        </div>
    );
}
