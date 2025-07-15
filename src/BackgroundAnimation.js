import React from 'react';
import './BackgroundAnimation.css';

export default function BackgroundAnimation() {
  return (
    <div className="background-graph">
      <div className="bars">
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={i}
            className="bar"
            style={{ animationDelay: `${(i % 5) * 0.2}s` }}
          />
        ))}
      </div>
    </div>
  );
}