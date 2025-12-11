import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../Footer';

export default function Home() {
  const images = [
    {
      src: 'https://media.istockphoto.com/id/1346124900/photo/confident-successful-mature-doctor-at-hospital.jpg?s=612x612&w=0&k=20&c=S93n5iTDVG3_kJ9euNNUKVl9pgXTOdVQcI_oDGG-QlE=',
      alt: 'Doctor portrait',
    },
    {
      src: 'https://northsidemedicalsupply.com/wp-content/uploads/2022/12/Medical-Supply-or-Equipment.jpg',
      alt: 'Medical equipment on table',
    },
    {
      src: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSng-nBLZCTm_TJo4K2zNz4U1ESGpB4kyHI2w&s',
      alt: 'Assorted medicine and pills',
    },
    {
      src: 'https://images.unsplash.com/photo-1511174511562-5f7f18b874f8?q=80&w=1200&auto=format&fit=crop&cs=tinysrgb',
      alt: 'Doctor checking patient during consultation',
    },
    {
      src: 'data:image/jpeg;base64,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',
      alt: 'Stethoscope on a table',
    },
    {
      src: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTez66xqVKQWfYj3NhA0T9QoMj_fu5jMekTBA&s',
      alt: 'Laboratory equipment and test tubes',
    },
  ];

  // Use the same images as background slideshow (could be a different array if desired)
  const backgrounds = images.map((i) => i.src);

  const [index, setIndex] = useState(0);
  const [bgIndex, setBgIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  // carousel auto-advance
  useEffect(() => {
    const id = setInterval(() => {
      if (!paused) setIndex((i) => (i + 1) % images.length);
    }, 3000);
    return () => clearInterval(id);
  }, [paused]);

  // background slideshow (separate timing)
  useEffect(() => {
    const id = setInterval(() => {
      setBgIndex((b) => (b + 1) % backgrounds.length);
    }, 6000);
    return () => clearInterval(id);
  }, [backgrounds.length]);

  // keyboard navigation for carousel
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight') setIndex((i) => (i + 1) % images.length);
      if (e.key === 'ArrowLeft') setIndex((i) => (i - 1 + images.length) % images.length);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const next = () => setIndex((i) => (i + 1) % images.length);
  const prev = () => setIndex((i) => (i - 1 + images.length) % images.length);

  return (
    <>
      <section className="home-hero">
        {/* Background slideshow layers */}
        <div className="hero-bg" aria-hidden="true">
          {backgrounds.map((src, i) => (
            <div
              key={i}
              className={i === bgIndex ? 'bg-layer active' : 'bg-layer'}
              style={{ backgroundImage: `url('${src}')` }}
            />
          ))}
          {/* subtle overlay to keep text readable */}
          <div className="hero-bg-overlay" />
        </div>

        <div className="hero-left">
          <h2>Welcome to Health App</h2>
          <p>
            Find physicians, manage appointments, and access trusted medical information. Our
            platform connects citizens with healthcare resources and professionals.
          </p>
          <div style={{ marginTop: 12 }}>
            <Link className="cta" to="/citizen">Get Started</Link>
          </div>
        </div>

        <div
          className="hero-right"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          aria-hidden="false"
        >
          <div className="carousel" style={{ transform: `translateX(-${index * 100}%)` }}>
            {images.map((item, i) => (
              <div className="slide" key={i} aria-hidden={i !== index}>
                <img src={item.src} alt={item.alt} loading="lazy" />
              </div>
            ))}
          </div>

          <div className="carousel-nav">
            <button className="nav-btn prev" onClick={prev} aria-label="Previous slide">‹</button>
            <button className="nav-btn next" onClick={next} aria-label="Next slide">›</button>
          </div>

          <div className="carousel-dots">
            {images.map((_, i) => (
              <button
                key={i}
                className={i === index ? 'dot active' : 'dot'}
                onClick={() => setIndex(i)}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>

          <div className="sr-only" aria-live="polite">{images[index].alt}</div>
        </div>
      </section>
      <Footer />
    </>
  );
}
