import React, { useMemo, useState } from 'react';

export default function About() {
  const bubbles = useMemo(() => [
    { left: 6, size: 36, delay: 0, duration: 12 },
    { left: 18, size: 52, delay: 1.5, duration: 15 },
    { left: 34, size: 28, delay: 0.8, duration: 10 },
    { left: 50, size: 68, delay: 2.2, duration: 18 },
    { left: 68, size: 44, delay: 0.5, duration: 13 },
    { left: 84, size: 56, delay: 1.9, duration: 16 }
  ], []);

  const [email, setEmail] = useState('');
  const [subscribing, setSubscribing] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:3001/api';

  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (!email) return;
    setSubscribing(true);
    try {
      const res = await fetch(`${API_BASE}/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      if (res.ok) {
        setSubscribed(true);
        setEmail('');
      } else {
        alert('Failed to subscribe. Please try again.');
      }
    } catch (err) {
      console.error(err);
      alert('Error subscribing.');
    } finally {
      setSubscribing(false);
    }
  };

  return (
    <div className="page-with-bg page-with-bg--about" style={{ position: 'relative', minHeight: '100vh' }}>
      <video className="bg-video" autoPlay muted loop playsInline preload="auto">
        <source src="/backgrounds/underwater.mp4" type="video/mp4" />
        <img className="bg-fallback" src="/backgrounds/underwater.svg" alt="Underwater background" aria-hidden="true" />
      </video>

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

      <div className="about-container">
        <h2>About</h2>
        <p style={{ lineHeight: 1.6, color: '#33475b' }}>
          This Health App is a demo project showcasing a modern, responsive web application built with React and Node.js.
          Our goal is to simplify healthcare management for both providers and citizens.
        </p>

        <hr style={{ margin: '24px 0', border: 'none', borderTop: '1px solid #eee' }} />

        <h3>Stay Updated</h3>
        <p style={{ fontSize: '0.95em', color: '#586069', marginBottom: 16 }}>
          Subscribe to our newsletter to receive the latest updates and features.
        </p>

        {subscribed ? (
          <div className="notice" style={{ display: 'inline-block' }}>
            Thanks for subscribing!
          </div>
        ) : (
          <form onSubmit={handleSubscribe} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input
              type="email"
              required
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                flex: 1,
                minWidth: 200,
                padding: '10px 12px',
                border: '1px solid #e1e6ec',
                borderRadius: 8,
                fontSize: 14
              }}
            />
            <button type="submit" className="btn-primary" disabled={subscribing}>
              {subscribing ? '...' : 'Subscribe'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
