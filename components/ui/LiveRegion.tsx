"use client";

import { useEffect, useRef } from "react";

/**
 * ✅ A11y: Live Region for screen reader announcements
 * Use for toast notifications, form validation messages, loading states
 * Announces content changes without requiring focus
 *
 * Example:
 * <LiveRegion polite message="Arquivo salvo com sucesso" />
 */
export function LiveRegion({
  message,
  type = "polite",
}: {
  message: string | null;
  type?: "polite" | "assertive";
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Force screen reader to announce by clearing and re-adding content
    if (message && ref.current) {
      ref.current.textContent = "";
      // Use setTimeout to ensure screen reader picks up the change
      setTimeout(() => {
        if (ref.current) {
          ref.current.textContent = message;
        }
      }, 0);
    }
  }, [message]);

  return (
    <div
      ref={ref}
      role="status"
      aria-live={type}
      aria-atomic="true"
      className="sr-only"
    />
  );
}
