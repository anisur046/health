import React, { useMemo } from 'react';
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
        <p>For inquiries, email: support@healthapp.example or call: (555) 123-4567</p>
      </div>
    </div>
  );
}
