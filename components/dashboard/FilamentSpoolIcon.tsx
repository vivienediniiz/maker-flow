"use client";

import { useId } from "react";

interface FilamentSpoolIconProps {
  colorHex: string;
  fillPercent: number;
  size?: number;
  isLow?: boolean;
}

export function FilamentSpoolIcon({ colorHex, fillPercent, size = 64, isLow = false }: FilamentSpoolIconProps) {
  const gradientId = useId();
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.max(0, Math.min(100, fillPercent)) / 100);

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className="shrink-0" aria-hidden>
      <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="7" />
      <circle
        cx="50"
        cy="50"
        r={radius}
        fill="none"
        stroke={isLow ? "#FF4E4E" : `url(#${gradientId})`}
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform="rotate(-90 50 50)"
        className="transition-all"
      />
      <circle cx="50" cy="50" r="28" fill={colorHex} opacity="0.92" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
      <circle cx="50" cy="50" r="8" fill="#0B0914" />
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#E86333" />
          <stop offset="50%" stopColor="#FF4EDF" />
          <stop offset="100%" stopColor="#AA17DB" />
        </linearGradient>
      </defs>
    </svg>
  );
}
