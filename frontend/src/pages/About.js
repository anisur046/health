import React, { useMemo, useState } from 'react';
import Footer from '../Footer';
import { API_BASE } from '../config';

export default function About() {
  const bubbles = useMemo(() => [
    { left: 6, size: 36, delay: 0, duration: 12 },
    { left: 18, size: 52, delay: 1.5, duration: 15 },
    { left: 34, size: 28, delay: 0.8, duration: 10 },
    { left: 50, size: 68, delay: 2.2, duration: 18 },
    { left: 68, size: 44, delay: 0.5, duration: 13 },
    { left: 84, size: 56, delay: 1.9, duration: 16 }
  ], []);

  // Newsletter State
  const [email, setEmail] = useState('');
  const [subscribing, setSubscribing] = useState(false);
  const [subscribed, setSubscribed] = useState(false);


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

  const features = [
    {
      icon: '🏥',
      title: 'Find Physicians',
      description: 'Search and connect with qualified healthcare professionals in your area.'
    },
    {
      icon: '📅',
      title: 'Manage Appointments',
      description: 'Schedule, reschedule, and track your medical appointments with ease.'
    },
    {
      icon: '📊',
      title: 'Health Records',
      description: 'Access your medical history and health records securely anytime.'
    },
    {
      icon: '💊',
      title: 'Prescription Management',
      description: 'Keep track of your medications and receive timely reminders.'
    }
  ];

  const values = [
    {
      title: 'Patient-Centered Care',
      description: 'We put patients first, ensuring accessible and quality healthcare for everyone.'
    },
    {
      title: 'Innovation',
      description: 'Leveraging cutting-edge technology to improve healthcare delivery and outcomes.'
    },
    {
      title: 'Trust & Security',
      description: 'Your health data is protected with industry-leading security measures.'
    },
    {
      title: 'Accessibility',
      description: 'Making healthcare services available to everyone, anywhere, anytime.'
    }
  ];

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
        <h1 style={{ fontSize: '32px', marginBottom: '16px', color: '#0b3954', textAlign: 'center' }}>About Health App</h1>

        {/* Mission Statement */}
        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '24px', color: '#0366d6', marginBottom: '12px' }}>Our Mission</h2>
          <p style={{ fontSize: '16px', lineHeight: '1.7', color: '#33475b' }}>
            Health App is dedicated to revolutionizing healthcare accessibility by connecting patients with healthcare
            professionals through a seamless digital platform. We believe that quality healthcare should be accessible
            to everyone, regardless of location or circumstance.
          </p>
        </section>

        {/* Vision */}
        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '24px', color: '#0366d6', marginBottom: '12px' }}>Our Vision</h2>
          <p style={{ fontSize: '16px', lineHeight: '1.7', color: '#33475b' }}>
            To become the leading digital health platform that empowers individuals to take control of their health
            journey while providing healthcare professionals with the tools they need to deliver exceptional care.
          </p>
        </section>

        {/* Features Grid */}
        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '24px', color: '#0366d6', marginBottom: '20px', textAlign: 'center' }}>What We Offer</h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '20px',
            marginBottom: '20px'
          }}>
            {features.map((feature, index) => (
              <div key={index} style={{
                background: 'linear-gradient(135deg, #f6f8fa 0%, #ffffff 100%)',
                padding: '24px',
                borderRadius: '12px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                transition: 'transform 250ms ease, box-shadow 250ms ease',
                cursor: 'default'
              }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 8px 20px rgba(3, 102, 214, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
                }}>
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>{feature.icon}</div>
                <h3 style={{ fontSize: '18px', color: '#0b3954', marginBottom: '8px' }}>{feature.title}</h3>
                <p style={{ fontSize: '14px', color: '#586069', lineHeight: '1.6', margin: 0 }}>{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Core Values */}
        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '24px', color: '#0366d6', marginBottom: '20px', textAlign: 'center' }}>Our Core Values</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            {values.map((value, index) => (
              <div key={index} style={{
                background: '#fff',
                padding: '20px',
                borderRadius: '10px',
                borderLeft: '4px solid #0366d6',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)'
              }}>
                <h3 style={{ fontSize: '16px', color: '#0b3954', marginBottom: '8px', fontWeight: '600' }}>{value.title}</h3>
                <p style={{ fontSize: '14px', color: '#586069', lineHeight: '1.6', margin: 0 }}>{value.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Newsletter Subscription (From HEAD) */}
        <section style={{ marginBottom: '32px', padding: '24px', background: '#eef4fb', borderRadius: '12px' }}>
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
                  fontSize: 14,
                  background: '#fff'
                }}
              />
              <button type="submit" className="btn-primary" disabled={subscribing}>
                {subscribing ? '...' : 'Subscribe'}
              </button>
            </form>
          )}
        </section>

        {/* Technology Stack */}
        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '24px', color: '#0366d6', marginBottom: '12px' }}>Technology</h2>
          <p style={{ fontSize: '16px', lineHeight: '1.7', color: '#33475b', marginBottom: '16px' }}>
            Built with modern web technologies to ensure a fast, secure, and reliable experience:
          </p>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
            marginBottom: '16px'
          }}>
            {['React', 'Node.js', 'Express', 'MySQL', 'REST API'].map((tech, index) => (
              <span key={index} style={{
                background: 'linear-gradient(135deg, #0366d6 0%, #0b79d0 100%)',
                color: '#fff',
                padding: '8px 16px',
                borderRadius: '20px',
                fontSize: '14px',
                fontWeight: '500',
                boxShadow: '0 2px 6px rgba(3, 102, 214, 0.2)'
              }}>
                {tech}
              </span>
            ))}
          </div>
        </section>

        {/* Contact CTA */}
        <section style={{
          textAlign: 'center',
          padding: '32px 20px',
          background: 'linear-gradient(135deg, rgba(3, 102, 214, 0.08) 0%, rgba(11, 121, 208, 0.12) 100%)',
          borderRadius: '12px',
          marginTop: '32px'
        }}>
          <h2 style={{ fontSize: '24px', color: '#0b3954', marginBottom: '12px' }}>Get in Touch</h2>
          <p style={{ fontSize: '16px', color: '#33475b', marginBottom: '20px' }}>
            Have questions or want to learn more about our platform?
          </p>
          <a
            href="/contact"
            style={{
              display: 'inline-block',
              background: 'linear-gradient(135deg, #0366d6 0%, #0b79d0 100%)',
              color: '#fff',
              padding: '12px 32px',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: '600',
              fontSize: '16px',
              boxShadow: '0 4px 12px rgba(3, 102, 214, 0.3)',
              transition: 'all 250ms ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(3, 102, 214, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(3, 102, 214, 0.3)';
            }}
          >
            Contact Us
          </a>
        </section>
      </div>
      <Footer />
    </div>
  );
}
