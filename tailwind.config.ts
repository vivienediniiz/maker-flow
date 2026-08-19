import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Base
        bg: {
          DEFAULT: "#0B0914",
          raised: "#120F1F",
          overlay: "#17132A",
        },
        // Neon status / accent tones
        neon: {
          green: "#00FF9D",
          pink: "#FF4EDF",
          purple: "#AA17DB",
          orange: "#E86333",
        },
        border: {
          glass: "rgba(255,255,255,0.08)",
          glassStrong: "rgba(255,255,255,0.16)",
        },
        text: {
          primary: "#F5F3FA",
          secondary: "#B4AFC4",
          muted: "#726C85",
        },
      },
      backgroundImage: {
        "neon-gradient":
          "linear-gradient(135deg, #E86333 0%, #FF4EDF 50%, #AA17DB 100%)",
        "neon-gradient-soft":
          "linear-gradient(135deg, rgba(232,99,51,0.25) 0%, rgba(255,78,223,0.25) 50%, rgba(170,23,219,0.25) 100%)",
        "glass-surface":
          "linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)",
        "radial-glow":
          "radial-gradient(circle at 50% 0%, rgba(170,23,219,0.25) 0%, rgba(11,9,20,0) 60%)",
      },
      fontFamily: {
        display: ["'Exo 2'", "system-ui", "sans-serif"],
        numeric: ["'Chakra Petch'", "system-ui", "sans-serif"],
        sans: ["'Montserrat'", "system-ui", "sans-serif"],
      },
      boxShadow: {
        "neon-glow": "0 0 24px rgba(255,78,223,0.35), 0 0 48px rgba(170,23,219,0.25)",
        "neon-glow-green": "0 0 20px rgba(0,255,157,0.35)",
        "neon-glow-orange": "0 0 20px rgba(232,99,51,0.35)",
        glass: "0 8px 32px rgba(0,0,0,0.35)",
      },
      backdropBlur: {
        glass: "20px",
      },
      borderRadius: {
        glass: "20px",
        pill: "999px",
      },
      keyframes: {
        "pulse-glow": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "blob-1": {
          "0%, 100%": {
            transform: "translate(-8%, -12%) rotate(0deg) scale(1)",
            borderRadius: "60% 40% 30% 70% / 60% 30% 70% 40%",
          },
          "25%": {
            transform: "translate(22%, 8%) rotate(18deg) scale(1.08)",
            borderRadius: "40% 60% 70% 30% / 50% 60% 40% 50%",
          },
          "50%": {
            transform: "translate(48%, 42%) rotate(-12deg) scale(0.95)",
            borderRadius: "50% 50% 30% 70% / 40% 70% 30% 60%",
          },
          "75%": {
            transform: "translate(14%, 22%) rotate(9deg) scale(1.05)",
            borderRadius: "65% 35% 55% 45% / 45% 55% 45% 55%",
          },
        },
        "blob-2": {
          "0%, 100%": {
            transform: "translate(12%, -10%) rotate(0deg) scale(1)",
            borderRadius: "50% 50% 40% 60% / 60% 40% 60% 40%",
          },
          "30%": {
            transform: "translate(-22%, 16%) rotate(-22deg) scale(1.1)",
            borderRadius: "35% 65% 60% 40% / 50% 60% 40% 50%",
          },
          "60%": {
            transform: "translate(-42%, 38%) rotate(12deg) scale(0.92)",
            borderRadius: "55% 45% 35% 65% / 65% 35% 65% 35%",
          },
          "85%": {
            transform: "translate(-10%, 6%) rotate(-6deg) scale(1.04)",
            borderRadius: "45% 55% 50% 50% / 55% 45% 55% 45%",
          },
        },
        "blob-3": {
          "0%, 100%": {
            transform: "translate(0%, 20%) rotate(0deg) scale(1)",
            borderRadius: "45% 55% 65% 35% / 40% 60% 40% 60%",
          },
          "20%": {
            transform: "translate(-26%, -8%) rotate(-15deg) scale(1.06)",
            borderRadius: "60% 40% 30% 70% / 55% 45% 55% 45%",
          },
          "50%": {
            transform: "translate(20%, -26%) rotate(20deg) scale(0.94)",
            borderRadius: "35% 65% 55% 45% / 60% 40% 60% 40%",
          },
          "80%": {
            transform: "translate(16%, 16%) rotate(-8deg) scale(1.05)",
            borderRadius: "50% 50% 45% 55% / 45% 55% 45% 55%",
          },
        },
        "caret-blink": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
        "float-y": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-14px)" },
        },
        "panel-in": {
          "0%": { transform: "translateX(-32px)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        "splash-logo": {
          "0%": { opacity: "0", transform: "scale(0.75)" },
          "15%": { opacity: "1", transform: "scale(1.06)" },
          "25%, 85%": { transform: "scale(1)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        "pulse-glow": "pulse-glow 2.4s ease-in-out infinite",
        shimmer: "shimmer 2.5s linear infinite",
        "blob-1": "blob-1 26s ease-in-out infinite",
        "blob-2": "blob-2 34s ease-in-out infinite",
        "blob-3": "blob-3 40s ease-in-out infinite",
        "caret-blink": "caret-blink 1s step-start infinite",
        "float-y": "float-y 6s ease-in-out infinite",
        "panel-in": "panel-in 0.7s cubic-bezier(0.16,1,0.3,1) forwards",
        "splash-logo": "splash-logo 5s ease-out forwards",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
