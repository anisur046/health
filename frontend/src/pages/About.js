import React, { useMemo } from 'react';

export default function About() {
  const bubbles = useMemo(() => [
    { left: 6, size: 36, delay: 0, duration: 12 },
    { left: 18, size: 52, delay: 1.5, duration: 15 },
    { left: 34, size: 28, delay: 0.8, duration: 10 },
    { left: 50, size: 68, delay: 2.2, duration: 18 },
    { left: 68, size: 44, delay: 0.5, duration: 13 },
    { left: 84, size: 56, delay: 1.9, duration: 16 }
  ], []);

  return (
    <div className="page-with-bg page-with-bg--about" style={{ position: 'relative', minHeight: '100vh' }}>
      <video className="bg-video" autoPlay muted loop playsInline preload="auto">
        <source src="/backgrounds/underwater.mp4" type="video/mp4" />
        <img className="bg-fallback" src="/backgrounds/underwater.svg"  alt="Underwater background" aria-hidden="true" />
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
        <p>This Health App is a demo project showing a React frontend and a Node/Express backend.</p>
      </div>
    </div>
  );
}
