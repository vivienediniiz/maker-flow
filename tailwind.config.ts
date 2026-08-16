import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
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
        "aurora-a": {
          "0%, 100%": { transform: "translate(-8%, -6%) scale(1)" },
          "50%": { transform: "translate(10%, 6%) scale(1.15)" },
        },
        "aurora-b": {
          "0%, 100%": { transform: "translate(8%, 8%) scale(1.1)" },
          "50%": { transform: "translate(-12%, -4%) scale(0.95)" },
        },
        "aurora-c": {
          "0%, 100%": { transform: "translate(0%, 10%) scale(1)" },
          "50%": { transform: "translate(-8%, -12%) scale(1.2)" },
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
      },
      animation: {
        "pulse-glow": "pulse-glow 2.4s ease-in-out infinite",
        shimmer: "shimmer 2.5s linear infinite",
        "aurora-a": "aurora-a 22s ease-in-out infinite",
        "aurora-b": "aurora-b 18s ease-in-out infinite",
        "aurora-c": "aurora-c 25s ease-in-out infinite",
        "caret-blink": "caret-blink 1s step-start infinite",
        "float-y": "float-y 6s ease-in-out infinite",
        "panel-in": "panel-in 0.7s cubic-bezier(0.16,1,0.3,1) forwards",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
