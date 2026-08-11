"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Bell, Search, LogOut, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { CompanyProfileModal } from "./CompanyProfileModal";

export function Topbar({ title }: { title: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const avatarRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (menuOpen && avatarRef.current) {
      const rect = avatarRef.current.getBoundingClientRect();
      setMenuPos({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
  }, [menuOpen]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border-glass bg-bg/70 px-6 py-4 backdrop-blur-glass md:px-8">
      <h1 className="font-display text-xl text-text-primary">{title}</h1>

      <div className="flex items-center gap-3">
        <div className="hidden items-center gap-2 rounded-pill border border-border-glass bg-white/[0.03] px-4 py-2 text-sm text-text-muted sm:flex">
          <Search size={14} />
          <span>Buscar pedidos, clientes...</span>
        </div>
        <button className="relative flex h-9 w-9 items-center justify-center rounded-full border border-border-glass bg-white/[0.03] text-text-secondary hover:text-text-primary">
          <Bell size={16} />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-neon-pink" />
        </button>

        <button
          ref={avatarRef}
          onClick={() => setMenuOpen((o) => !o)}
          className="h-9 w-9 rounded-full bg-neon-gradient"
          aria-label="Menu da conta"
        />
      </div>

      {menuOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[9998]" onClick={() => setMenuOpen(false)} />
            <div
              className="glass-card fixed z-[9999] w-44 overflow-hidden p-1 shadow-neon-glow"
              style={{ top: menuPos.top, right: menuPos.right }}
            >
              <button
                onClick={() => {
                  setMenuOpen(false);
                  setProfileModalOpen(true);
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-text-secondary hover:bg-white/5 hover:text-text-primary"
              >
                <User size={14} /> Minha conta
              </button>
              <button
                onClick={handleSignOut}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-red-400 hover:bg-red-500/10"
              >
                <LogOut size={14} /> Sair
              </button>
            </div>
          </>,
          document.body
        )}

      <CompanyProfileModal open={profileModalOpen} onClose={() => setProfileModalOpen(false)} />
    </header>
  );
}