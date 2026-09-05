"use client";

import { useEffect, useState } from "react";

/**
 * ✅ ACCESSIBILITY: Provides light/dark theme toggle with SSR-safe rendering
 * Allows users to choose their preferred color scheme
 * Prevents flash of unstyled content (FOUC) by reading theme before render
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    // Read theme from localStorage immediately (before render completes)
    const saved = (localStorage.getItem("theme") || "dark") as "light" | "dark";
    setTheme(saved);
    applyTheme(saved);
    setMounted(true);

    // ✅ Listen for storage changes (e.g., multiple tabs)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "theme" && e.newValue) {
        const newTheme = e.newValue as "light" | "dark";
        setTheme(newTheme);
        applyTheme(newTheme);
      }
    };

    window.addEventListener("storage", handleStorageChange);

    // ✅ CLEANUP: Remove listener when component unmounts, and reset <html> pro
    // tema escuro fixo — esse provider só existe dentro do dashboard, então
    // saltar pra landing/login (navegação client-side, sem reload) não pode
    // carregar o modo light escolhido lá dentro.
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      const html = document.documentElement;
      html.classList.add("dark");
      html.removeAttribute("data-theme");
    };
  }, []);

  const applyTheme = (theme: "light" | "dark") => {
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
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
    window.dispatchEvent(new CustomEvent("theme-change", { detail: { theme: next } }));
  };

  // ✅ SSR-safe: Render button only after hydration to avoid mismatch
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
