import React, { useMemo, useState } from 'react';
import { API_BASE } from '../Api'; // Assuming you have an API constant, or use localhost
// Actually looking at previous files, API_BASE usually isn't imported in simple pages, but we can hardcode or use relative if proxy is set. 
// However, previous Admin.js uses API_BASE. Let's check imports.
// Actually, let's just use relative '/api/...' if proxy is set in package.json, or hardcode for now based on other files.
// Admin.js uses: const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:3001/api';
// I should duplicate that definition or import it if available.
// Let's use the env var locally.
import underwaterVideo from '../backgrounds/underwater.mp4';
import underwaterSVG from '../backgrounds/underwater.svg';

export default function ContactUs() {
  // generate deterministic bubble specs for rendering
  const bubbles = useMemo(() => [
    { left: 8, size: 36, delay: 0, duration: 10 },
    { left: 22, size: 56, delay: 2, duration: 14 },
    { left: 38, size: 28, delay: 1.2, duration: 9 },
    { left: 52, size: 72, delay: 3.5, duration: 16 },
    { left: 66, size: 40, delay: 0.6, duration: 11 },
    { left: 80, size: 52, delay: 2.8, duration: 13 },
    { left: 92, size: 30, delay: 1.6, duration: 12 }
  ], []);

  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:3001/api';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) return;
    setSending(true);
    try {
      const res = await fetch(`${API_BASE}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      let data;
      try {
        data = await res.json();
      } catch (e) {
        data = { message: res.statusText };
      }

      if (res.ok) {
        setSent(true);
        setFormData({ name: '', email: '', subject: '', message: '' });
      } else {
        alert('Failed to send message: ' + (data.message || 'Unknown error'));
      }
    } catch (err) {
      console.error(err);
      alert('Error sending message.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="page-with-bg page-with-bg--contact" style={{ position: 'relative', minHeight: '100vh' }}>
      {/* Background video (place public/backgrounds/underwater.mp4 to use) */}
      <video className="bg-video" autoPlay muted loop playsInline preload="auto">
        <source src={underwaterVideo} type="video/mp4" />
        {/* fallback image if video not available */}
        <img className="bg-fallback" src={underwaterSVG} alt="Underwater background" aria-hidden="true" />
      </video>

      {/* decorative moving bubbles rendered as absolute elements */}
      <div className="water-bubbles" aria-hidden={true}>
        {bubbles.map((b, i) => (
          <div
            key={i}
            className="water-bubble"
            style={{ left: `${b.left}%`, width: b.size, height: b.size, animationDelay: `${b.delay}s`, ['--dur']: `${b.duration}s` }}
          >
            <div className="bubble-core" />
          </div>
        ))}
      </div>

      <div className="contact-container">
        <h2>Contact Us</h2>
        <p style={{ marginBottom: 20, color: '#586069' }}>
          Have questions? Send us a message and we'll get back to you.
        </p>

        {sent ? (
          <div className="notice">
            Thank you! Your message has been sent. We will contact you shortly.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="citizen-form">
            <label htmlFor="c-name">Name</label>
            <input
              id="c-name"
              required
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder="Your Name"
            />

            <label htmlFor="c-email">Email</label>
            <input
              id="c-email"
              type="email"
              required
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              placeholder="name@example.com"
            />

            <label htmlFor="c-subject">Subject</label>
            <input
              id="c-subject"
              required
              value={formData.subject}
              onChange={e => setFormData({ ...formData, subject: e.target.value })}
              placeholder="How can we help?"
            />

            <label htmlFor="c-message">Message</label>
            <textarea
              id="c-message"
              required
              rows={5}
              value={formData.message}
              onChange={e => setFormData({ ...formData, message: e.target.value })}
              style={{
                width: '100%',
                padding: '10px 12px',
                marginTop: 6,
                border: '1px solid #e1e6ec',
                borderRadius: 8,
                fontSize: 14,
                color: '#0b3954',
                fontFamily: 'inherit'
              }}
              placeholder="Tell us more details..."
            />

            <div style={{ marginTop: 20 }}>
              <button type="submit" className="btn-primary" disabled={sending}>
                {sending ? 'Sending...' : 'Send Message'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
