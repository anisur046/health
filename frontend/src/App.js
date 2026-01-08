import React, { useState, useEffect } from 'react';
import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import Admin from './pages/Admin';
import AdminDoctors from './pages/AdminDoctors';
import AdminAppointments from './pages/AdminAppointments';
import Reports from './pages/Reports';
import Citizen from './pages/Citizen';
import CitizenForm from './pages/CitizenForm';
import ContactUs from './pages/ContactUs';
import About from './pages/About';

import WaterBackground from './WaterBackground';

export default function App() {
  // track admin authentication so navbar can show Reports after admin login
  const [adminAuthenticated, setAdminAuthenticated] = useState(() => !!sessionStorage.getItem('adminToken'));
  const location = useLocation();

  useEffect(() => {
    const onAuth = () => setAdminAuthenticated(!!sessionStorage.getItem('adminToken'));
    const onCustom = onAuth;
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

  // Determine if current route is home so we can render it full-screen outside the page container
  const isHome = location.pathname === '/';

  return (
    <div className="app-root">
      <WaterBackground />
      <nav className="app-nav" style={{ marginBottom: 16 }}>
        <NavLink to="/" end className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
          Home
        </NavLink>
        {adminAuthenticated ? (
          <div className="nav-item-dropdown">
            <NavLink to="/admin" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
              Admin
            </NavLink>
            <div className="dropdown-content">
              <NavLink to="/admin" end>Dashboard</NavLink>
              <NavLink to="/admin/doctors">Doctor Availability</NavLink>
              <NavLink to="/admin/appointments">Time Schedule</NavLink>
            </div>
          </div>
        ) : (
          <NavLink to="/admin" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
            Admin
          </NavLink>
        )}
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

      {/* Render Home full-screen outside .page-container so it can fill the viewport */}
      <Routes>
        <Route path="/" element={<Home />} />
      </Routes>

      {
        !isHome && (
          <main className="page-container">
            <Routes>
              <Route path="/admin" element={<Admin />} />
              <Route path="/admin/doctors" element={<AdminDoctors />} />
              <Route path="/admin/appointments" element={<AdminAppointments />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/citizen" element={<Citizen />} />
              <Route path="/citizen/appointments" element={<CitizenForm />} />
              <Route path="/contact" element={<ContactUs />} />
              <Route path="/about" element={<About />} />
              <Route path="*" element={<Home />} />
            </Routes>
          </main>
        )
      }
    </div >
  );
}
