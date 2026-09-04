"use client";

import { useEffect, useState } from "react";

/**
 * ✅ ACCESSIBILITY: Provides light/dark theme toggle
 * Allows users to choose their preferred color scheme
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("theme") || "dark";
    applyTheme(saved);
  }, []);

  const applyTheme = (theme: string) => {
    const html = document.documentElement;
    if (theme === "light") {
      html.classList.remove("dark");
      html.setAttribute("data-theme", "light");
    } else {
      html.classList.add("dark");
      html.removeAttribute("data-theme");
    }
    localStorage.setItem("theme", theme);
  };

  const toggleTheme = () => {
    const current = localStorage.getItem("theme") || "dark";
    const next = current === "dark" ? "light" : "dark";
    applyTheme(next);
    window.dispatchEvent(new CustomEvent("theme-change", { detail: { theme: next } }));
  };

  if (!mounted) return children;

  return (
    <>
      {children}
      <button
        onClick={toggleTheme}
        className="fixed bottom-4 right-4 z-40 h-10 w-10 rounded-full bg-neon-pink/20 p-2 text-neon-pink hover:bg-neon-pink/30 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-neon-pink"
        aria-label="Toggle theme (light/dark)"
        title="Toggle light/dark mode"
      >
        {typeof document !== "undefined" &&
        document.documentElement.classList.contains("dark") ? (
          <svg className="h-full w-full" fill="currentColor" viewBox="0 0 20 20">
            <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
          </svg>
        ) : (
          <svg className="h-full w-full" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.536l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.121-10.607a1 1 0 010 1.414l-.707.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zm5.657-9.193a1 1 0 00-1.414 0l-.707.707A1 1 0 005.05 13.536l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 000-1.414zM3 11a1 1 0 100-2H2a1 1 0 100 2h1z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </button>
    </>
  );
}
