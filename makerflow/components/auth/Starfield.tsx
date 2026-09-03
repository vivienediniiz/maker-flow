"use client";

import { useMemo } from "react";

interface Star {
  top: number;
  left: number;
  size: number;
  opacity: number;
  duration: number;
  delay: number;
}

interface Sparkle {
  top: number;
  left: number;
  size: number;
  opacity: number;
  duration: number;
  delay: number;
}

// Área (em % do canto superior esquerdo) reservada pra logo — nenhuma
// estrela/sparkle nasce ali, pra não ficar "em cima" dela.
const LOGO_CLEARANCE = { top: 18, left: 38 };

function randomPositionOutsideLogo() {
  let top: number;
  let left: number;
  do {
    top = Math.random() * 100;
    left = Math.random() * 100;
  } while (top < LOGO_CLEARANCE.top && left < LOGO_CLEARANCE.left);
  return { top, left };
}

function seededStars(count: number): Star[] {
  return Array.from({ length: count }, () => ({
    ...randomPositionOutsideLogo(),
    size: Math.random() < 0.15 ? 2.5 : 1.2,
    opacity: 0.25 + Math.random() * 0.6,
    duration: 2 + Math.random() * 3,
    delay: Math.random() * 4,
  }));
}

function seededSparkles(count: number): Sparkle[] {
  return Array.from({ length: count }, () => ({
    ...randomPositionOutsideLogo(),
    size: 10 + Math.random() * 10,
    opacity: 0.5 + Math.random() * 0.4,
    duration: 2.5 + Math.random() * 3,
    delay: Math.random() * 4,
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
          className="absolute animate-twinkle rounded-full bg-white"
          style={
            {
              top: `${s.top}%`,
              left: `${s.left}%`,
              width: s.size,
              height: s.size,
              animationDuration: `${s.duration}s`,
              animationDelay: `${s.delay}s`,
              "--peak-opacity": s.opacity,
            } as React.CSSProperties
          }
        />
      ))}
      {sparkles.map((s, i) => (
        <svg
          key={i}
          viewBox="0 0 24 24"
          fill="white"
          className="absolute animate-twinkle"
          style={
            {
              top: `${s.top}%`,
              left: `${s.left}%`,
              width: s.size,
              height: s.size,
              filter: "drop-shadow(0 0 4px rgba(255,255,255,0.8))",
              animationDuration: `${s.duration}s`,
              animationDelay: `${s.delay}s`,
              "--peak-opacity": s.opacity,
            } as React.CSSProperties
          }
        >
          <path d="M12 0 L14.2 9.8 L24 12 L14.2 14.2 L12 24 L9.8 14.2 L0 12 L9.8 9.8 Z" />
        </svg>
      ))}
    </div>
  );
}
