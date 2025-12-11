import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
    const year = new Date().getFullYear();

    return (
        <footer className="app-footer">
            <div className="footer-content">
                <div className="footer-section">
                    <h3>Health App</h3>
                    <p>Your trusted partner for digital health management.</p>
                </div>
                <div className="footer-section">
                    <h4>Quick Links</h4>
                    <Link to="/">Home</Link>
                    <Link to="/about">About Us</Link>
                    <Link to="/citizen">Citizen Portal</Link>
                    <Link to="/contact">Contact</Link>
                </div>
                <div className="footer-section">
                    <h4>Legal</h4>
                    <Link to="/privacy">Privacy Policy</Link>
                    <Link to="/terms">Terms of Service</Link>
                </div>
            </div>
            <div className="footer-bottom">
                <p>&copy; {year} Health App. All rights reserved.</p>
            </div>
        </footer>
    );
}
