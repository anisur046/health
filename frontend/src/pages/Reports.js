import React, { useEffect, useState, useRef } from 'react';
import { jsPDF } from 'jspdf';

const DEFAULT_DEV_BACKEND = 'http://localhost:3001/api';
export default function Reports() {
  const API_BASE = process.env.REACT_APP_API_BASE || (process.env.NODE_ENV === 'development' ? DEFAULT_DEV_BACKEND : '/api');

  const parseResponse = async (res) => {
    const text = await res.text();
    if (!text) return {};
    try { return JSON.parse(text); } catch (err) { return { message: text, _raw: text }; }
  };

  const [appointments, setAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fromDate, setFromDate] = useState(''); // yyyy-mm-dd
  const [toDate, setToDate] = useState(''); // yyyy-mm-dd
  const [selectedFilter, setSelectedFilter] = useState('all'); // 'all' | 'approved' | 'rejected'
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const adminToken = localStorage.getItem('adminToken') || '';

  const fetchAppointments = async () => {
    if (!adminToken) { setError('Not authenticated as admin'); return; }
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/appointments`, {
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      });
      const data = await parseResponse(res);
      if (!res.ok) {
        const raw = (data && data._raw) || data.message || '';
        if (raw && typeof raw === 'string' && raw.toLowerCase().includes('cannot get')) {
          setError(`Backend returned HTML error: ${raw.split('\n')[0]}`);
        } else {
          setError(data.message || `Unable to fetch appointments (${res.status})`);
        }
        return;
      }
      setAppointments(data.appointments || []);
    } catch (err) {
      setError(err.message || 'Unable to fetch appointments');
    } finally { setIsLoading(false); }
  };

  useEffect(() => { fetchAppointments(); }, []);

  // fullscreen change listener
  useEffect(() => {
    const onFull = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFull);
    return () => document.removeEventListener('fullscreenchange', onFull);
  }, []);

  const enterFullScreen = async () => {
    try {
      if (containerRef.current && containerRef.current.requestFullscreen) {
        await containerRef.current.requestFullscreen();
      } else if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      } else {
        setError('Fullscreen API not supported in this browser.');
      }
    } catch (err) {
      setError('Unable to enter fullscreen.');
    }
  };

  const exitFullScreen = async () => {
    try {
      if (document.exitFullscreen) await document.exitFullscreen();
    } catch (err) {
      setError('Unable to exit fullscreen.');
    }
  };

  // Apply date range filter (if provided) and status filters
  const inDateRange = (a) => {
    if (!a || !a.datetime) return false;
    const dt = new Date(a.datetime);
    if (Number.isNaN(dt.getTime())) return false;
    if (fromDate) {
      const start = new Date(`${fromDate}T00:00:00`);
      if (dt < start) return false;
    }
    if (toDate) {
      // include entire day
      const end = new Date(`${toDate}T23:59:59.999`);
      if (dt > end) return false;
    }
    return true;
  };

  const filteredAppointments = appointments.filter((a) => {
    // if no date filters provided, include all
    if (fromDate || toDate) {
      return inDateRange(a);
    }
    return true;
  });

  const requestedAppts = filteredAppointments.filter((a) => a.status === 'requested');
  const approvedAppts = filteredAppointments.filter((a) => a.status === 'approved');
  const rejectedAppts = filteredAppointments.filter((a) => a.status === 'rejected');

  // list to export based on selected filter
  const exportList = selectedFilter === 'approved' ? approvedAppts : selectedFilter === 'rejected' ? rejectedAppts : filteredAppointments;

  const downloadCSV = (list = appointments, filename = 'appointments.csv') => {
    if (!list || list.length === 0) { setError('No appointments to download'); return; }
    const headers = ['ID','User','User Email','Doctor','Specialty','Datetime','Status','RejectionReason','Reason'];
    const rows = list.map((a) => [
      a.id, a.user ? a.user.name : a.userId, a.user ? a.user.email : '',
      a.doctor ? a.doctor.name : a.doctorId, a.doctor ? a.doctor.specialty : '',
      a.datetime || '', a.status || '', a.rejectionReason || '', a.reason || ''
    ]);
    const escapeCell = (v) => { if (v == null) return ''; const s = String(v); return `"${s.replace(/"/g,'""')}"`; };
    const csv = [headers.map(escapeCell).join(',')].concat(rows.map((r) => r.map(escapeCell).join(','))).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    setNotice(`Downloaded ${filename}`);
  };

  const downloadPDF = (list = appointments, filename = 'appointments.pdf') => {
    if (!list || list.length === 0) { setError('No appointments to download'); return; }
    try {
      const doc = new jsPDF({ unit: 'pt' });
      const margin = 40; let y = margin;
      doc.setFontSize(14); doc.text('Appointments Report', margin, y); y += 20; doc.setFontSize(10);
      const lineHeight = 14;
      doc.setFont(undefined, 'bold');
      doc.text('ID', margin, y); doc.text('User', margin + 70, y); doc.text('Doctor', margin + 230, y); doc.text('When', margin + 360, y); doc.text('Status', margin + 480, y);
      doc.setFont(undefined, 'normal'); y += lineHeight;
      list.forEach((a) => {
        const user = a.user ? a.user.name : a.userId;
        const doctor = a.doctor ? a.doctor.name : a.doctorId;
        const datetime = a.datetime || '';
        const status = a.status || '';
        if (y > doc.internal.pageSize.height - margin) { doc.addPage(); y = margin; }
        doc.text(String(a.id), margin, y); doc.text(String(user), margin + 70, y); doc.text(String(doctor), margin + 230, y); doc.text(String(datetime), margin + 360, y); doc.text(String(status), margin + 480, y);
        y += lineHeight;
        if (a.rejectionReason) {
          if (y > doc.internal.pageSize.height - margin) { doc.addPage(); y = margin; }
          doc.setFontSize(9); doc.text(`Rejection reason: ${a.rejectionReason}`, margin + 70, y); doc.setFontSize(10); y += lineHeight;
        }
      });
      doc.save(filename); setNotice(`Downloaded ${filename}`);
    } catch (err) { console.error(err); setError('Failed to generate PDF'); }
  };

  return (
    <div className="reports-container" ref={containerRef}>
      <h3>Reports</h3>
      {notice && <div className="notice">{notice}</div>}
      {error && <div className="error">{error}</div>}

      {isLoading ? (
        <p style={{ color: '#586069' }}>Loading reports…</p>
      ) : (
        <>
          <p className="reports-summary">Summary: {appointments.length} total — {requestedAppts.length} requested, {approvedAppts.length} approved, {rejectedAppts.length} rejected</p>

          <div className="reports-actions" style={{ marginBottom: 10, alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <label htmlFor="report-filter" style={{ color: '#586069', fontWeight: 600 }}>Show:</label>
              <select id="report-filter" value={selectedFilter} onChange={(e) => setSelectedFilter(e.target.value)} style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #e1e6ec' }}>
                <option value="all">All</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>

              <label htmlFor="from-date" style={{ color: '#586069', fontWeight: 600, marginLeft: 12 }}>From</label>
              <input id="from-date" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #e1e6ec' }} />

              <label htmlFor="to-date" style={{ color: '#586069', fontWeight: 600 }}>To</label>
              <input id="to-date" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #e1e6ec' }} />

              <button className="btn-muted" type="button" onClick={() => { setFromDate(''); setToDate(''); }} style={{ marginLeft: 6 }}>Clear</button>
            </div>

            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              {/* fullscreen toggle */}
              <button className="btn-muted" onClick={() => (isFullscreen ? exitFullScreen() : enterFullScreen())} style={{ marginRight: 8 }}>{isFullscreen ? 'Exit full screen' : 'Full screen'}</button>
              {/* export the currently filtered list */}
              <button className="btn-primary" onClick={() => downloadCSV(exportList, 'appointments.csv')} style={{ marginRight: 8 }}>Download CSV (Excel)</button>
              <button className="btn-primary" onClick={() => downloadPDF(exportList, 'appointments.pdf')}>Download PDF</button>
            </div>
          </div>

          {/* Render lists according to filter selection */}
          {selectedFilter === 'all' ? (
            <div className="reports-grid">
              <div className="reports-column">
                <h4>Approved</h4>
                {approvedAppts.length === 0 ? (
                  <p style={{ color: '#586069' }}>No approved appointments.</p>
                ) : (
                  <div className="table-wrap"><table className="reports-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>User</th>
                        <th>Doctor</th>
                        <th>When</th>
                      </tr>
                    </thead>
                    <tbody>
                      {approvedAppts.map((a) => (
                        <tr key={`approved-${a.id}`}>
                          <td>{a.id}</td>
                          <td>{a.user ? a.user.name : a.userId}</td>
                          <td>{a.doctor ? a.doctor.name : a.doctorId}</td>
                          <td>{a.datetime}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table></div>
                )}
              </div>

              <div className="reports-column">
                <h4>Rejected</h4>
                {rejectedAppts.length === 0 ? (
                  <p style={{ color: '#586069' }}>No rejected appointments.</p>
                ) : (
                  <div className="table-wrap"><table className="reports-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>User</th>
                        <th>Doctor</th>
                        <th>Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rejectedAppts.map((a) => (
                        <tr key={`rejected-${a.id}`}>
                          <td>{a.id}</td>
                          <td>{a.user ? a.user.name : a.userId}</td>
                          <td>{a.doctor ? a.doctor.name : a.doctorId}</td>
                          <td>{a.rejectionReason || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table></div>
                )}
              </div>
            </div>
          ) : selectedFilter === 'approved' ? (
            <div>
              <h4>Approved</h4>
              {approvedAppts.length === 0 ? <p style={{ color: '#586069' }}>No approved appointments.</p> : (
                <div className="table-wrap"><table className="reports-table"><thead><tr><th>ID</th><th>User</th><th>Doctor</th><th>When</th></tr></thead><tbody>
                  {approvedAppts.map((a) => (
                    <tr key={`approved-${a.id}`}><td>{a.id}</td><td>{a.user ? a.user.name : a.userId}</td><td>{a.doctor ? a.doctor.name : a.doctorId}</td><td>{a.datetime}</td></tr>
                  ))}
                </tbody></table></div>
              )}
            </div>
          ) : (
            <div>
              <h4>Rejected</h4>
              {rejectedAppts.length === 0 ? <p style={{ color: '#586069' }}>No rejected appointments.</p> : (
                <div className="table-wrap"><table className="reports-table"><thead><tr><th>ID</th><th>User</th><th>Doctor</th><th>Reason</th></tr></thead><tbody>
                  {rejectedAppts.map((a) => (
                    <tr key={`rejected-${a.id}`}><td>{a.id}</td><td>{a.user ? a.user.name : a.userId}</td><td>{a.doctor ? a.doctor.name : a.doctorId}</td><td>{a.rejectionReason || '-'}</td></tr>
                  ))}
                </tbody></table></div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
 }
