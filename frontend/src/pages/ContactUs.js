import React, { useState } from 'react';
import Footer from '../Footer';

export default function ContactUs() {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [status, setStatus] = useState({ type: '', msg: '' });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: '', msg: '' });

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.ok) {
        setStatus({ type: 'success', msg: data.message });
        setFormData({ name: '', email: '', message: '' });
      } else {
        setStatus({ type: 'error', msg: data.message || 'Error sending message' });
      }
    } catch (err) {
      console.error(err);
      setStatus({ type: 'error', msg: 'Failed to connect to server' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="contact-container">
      <h2>Contact Us</h2>
      <p style={{ marginBottom: '20px', color: '#586069' }}>
        Have questions? Fill out the form below and we'll obtain back to you shortly.
      </p>

      {status.msg && (
        <div className={status.type === 'error' ? 'error' : 'notice'}>
          {status.msg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="admin-form">
        <div className="form-group">
          <label htmlFor="name">Name</label>
          <input
            id="name"
            name="name"
            type="text"
            value={formData.name}
            onChange={handleChange}
            required
            placeholder="Your Name"
          />
        </div>

        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            required
            placeholder="your@email.com"
          />
        </div>

        <div className="form-group">
          <label htmlFor="message">Message</label>
          <textarea
            id="message"
            name="message"
            rows="5"
            value={formData.message}
            onChange={handleChange}
            required
            placeholder="How can we help you?"
            style={{
              width: '100%',
              padding: '10px 12px',
              marginTop: '6px',
              border: '1px solid #e1e6ec',
              borderRadius: '8px',
              fontSize: '14px',
              color: '#0b3954',
              fontFamily: 'inherit'
            }}
          />
        </div>

        <div style={{ marginTop: '20px' }}>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Sending...' : 'Send Message'}
          </button>
        </div>
      </form>

      <div style={{ marginTop: '40px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
        <h3>Other Ways to Reach Us</h3>
        <p>Email: <strong>support@healthapp.example</strong></p>
        <p>Phone: <strong>(555) 123-4567</strong></p>
        <p>Address: 123 Health St, Wellness City, HC 90210</p>
      </div>
      <Footer />
    </div>
  );
}
