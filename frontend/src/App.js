import React, { useState, useEffect } from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import Home from './pages/Home';
import Admin from './pages/Admin';
import Reports from './pages/Reports';
import Citizen from './pages/Citizen';
import CitizenForm from './pages/CitizenForm';
import ContactUs from './pages/ContactUs';
import About from './pages/About';

export default function App() {
  // track admin authentication so navbar can show Reports after admin login
  const [adminAuthenticated, setAdminAuthenticated] = useState(() => !!localStorage.getItem('adminToken'));

  useEffect(() => {
    const onAuth = () => setAdminAuthenticated(!!localStorage.getItem('adminToken'));
    const onCustom = (e) => onAuth();
    const onStorage = (e) => {
      if (e.key === 'adminToken') setAdminAuthenticated(!!e.newValue);
    };
    window.addEventListener('admin-auth', onCustom);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('admin-auth', onCustom);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const ping = async () => {
    try {
      const res = await fetch('/api/hello');
      const j = await res.json();
      alert(j.message);
    } catch (e) {
      alert('Request failed: ' + e.message);
    }
  };

  return (
    <div className="app-root">
      <nav className="app-nav" style={{ marginBottom: 16 }}>
        <NavLink to="/" end className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
          Home
        </NavLink>
        <NavLink to="/admin" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
          Admin
        </NavLink>
        {adminAuthenticated && (
          <NavLink to="/reports" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
            Reports
          </NavLink>
        )}
        <NavLink to="/citizen" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
          Citizen
        </NavLink>
        <NavLink to="/citizen/appointments" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
          Appointments
        </NavLink>
        <NavLink to="/contact" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
          Contact Us
        </NavLink>
        <NavLink to="/about" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
          About
        </NavLink>
      </nav>

      <main className="page-container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/citizen" element={<Citizen />} />
          <Route path="/citizen/appointments" element={<CitizenForm />} />
          <Route path="/contact" element={<ContactUs />} />
          <Route path="/about" element={<About />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </main>
    </div>
  );
}
