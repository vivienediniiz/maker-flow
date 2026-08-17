"use client";

import { useMemo } from "react";

interface Star {
  top: number;
  left: number;
  size: number;
  opacity: number;
}

interface Sparkle {
  top: number;
  left: number;
  size: number;
  opacity: number;
}

function seededStars(count: number): Star[] {
  return Array.from({ length: count }, () => ({
    top: Math.random() * 100,
    left: Math.random() * 100,
    size: Math.random() < 0.15 ? 2.5 : 1.2,
    opacity: 0.25 + Math.random() * 0.6,
  }));
}

function seededSparkles(count: number): Sparkle[] {
  return Array.from({ length: count }, () => ({
    top: Math.random() * 100,
    left: Math.random() * 100,
    size: 10 + Math.random() * 10,
    opacity: 0.5 + Math.random() * 0.4,
  }));
}

export function Starfield() {
  const stars = useMemo(() => seededStars(160), []);
  const sparkles = useMemo(() => seededSparkles(5), []);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {stars.map((s, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-white"
          style={{
            top: `${s.top}%`,
            left: `${s.left}%`,
            width: s.size,
            height: s.size,
            opacity: s.opacity,
          }}
        />
      ))}
      {sparkles.map((s, i) => (
        <svg
          key={i}
          viewBox="0 0 24 24"
          fill="white"
          className="absolute"
          style={{
            top: `${s.top}%`,
            left: `${s.left}%`,
            width: s.size,
            height: s.size,
            opacity: s.opacity,
            filter: "drop-shadow(0 0 4px rgba(255,255,255,0.8))",
          }}
        >
          <path d="M12 0 L14.2 9.8 L24 12 L14.2 14.2 L12 24 L9.8 14.2 L0 12 L9.8 9.8 Z" />
        </svg>
      ))}
    </div>
  );
}
