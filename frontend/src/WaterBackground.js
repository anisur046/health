import React from 'react';

const WaterBackground = () => {
    // Generate random bubbles with different sizes and delays
    const bubbles = Array.from({ length: 15 }).map((_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        size: `${20 + Math.random() * 60}px`,
        delay: `${Math.random() * 5}s`,
        duration: `${10 + Math.random() * 10}s`
    }));

    return (
        <div className="water-bubbles-global">
            {bubbles.map(b => (
                <div
                    key={b.id}
                    className="water-bubble"
                    style={{
                        left: b.left,
                        width: b.size,
                        height: b.size,
                        animationDelay: b.delay,
                        '--dur': b.duration
                    }}
                >
                    <div className="bubble-core"></div>
                </div>
            ))}
        </div>
    );
};

export default WaterBackground;
