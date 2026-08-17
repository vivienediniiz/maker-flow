"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Bell, Search, LogOut, User, Menu } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { CompanyProfileModal } from "./CompanyProfileModal";
import { useMobileSidebar } from "./MobileSidebarContext";

interface TopbarProps {
  title: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
}

export function Topbar({ title, searchValue, onSearchChange, searchPlaceholder }: TopbarProps) {
  const router = useRouter();
  const supabase = createClient();
  const { toggle: toggleSidebar } = useMobileSidebar();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const avatarRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("profiles").select("avatar_url").eq("id", user.id).single();
      if (data?.avatar_url) setAvatarUrl(data.avatar_url);
    })();
  }, []);

  useEffect(() => {
    function openFromEvent() {
      setMenuOpen(false);
      setProfileModalOpen(true);
    }
    window.addEventListener("open-account-modal", openFromEvent);
    return () => window.removeEventListener("open-account-modal", openFromEvent);
  }, []);

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
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border-glass bg-bg/70 px-4 py-4 backdrop-blur-glass md:px-8">
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border-glass bg-white/[0.03] text-text-secondary hover:text-text-primary md:hidden"
          aria-label="Abrir menu"
        >
          <Menu size={18} />
        </button>
        <h1 className="font-display text-xl text-text-primary">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        {onSearchChange ? (
          <div className="hidden items-center gap-2 rounded-pill border border-border-glass bg-white/[0.03] px-4 py-2 sm:flex">
            <Search size={14} className="text-text-muted" />
            <input
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder || "Buscar..."}
              className="w-48 bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
            />
          </div>
        ) : (
          <div className="hidden items-center gap-2 rounded-pill border border-border-glass bg-white/[0.03] px-4 py-2 text-sm text-text-muted sm:flex">
            <Search size={14} />
            <span>Buscar pedidos, clientes...</span>
          </div>
        )}
        <button className="relative flex h-9 w-9 items-center justify-center rounded-full border border-border-glass bg-white/[0.03] text-text-secondary hover:text-text-primary">
          <Bell size={16} />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-neon-pink" />
        </button>

        <button
          ref={avatarRef}
          onClick={() => setMenuOpen((o) => !o)}
          className="h-9 w-9 overflow-hidden rounded-full bg-neon-gradient"
          aria-label="Menu da conta"
        >
          {avatarUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
          )}
        </button>
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

      <CompanyProfileModal
        open={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        onSaved={(profile) => {
          if (profile.avatar_url !== undefined) setAvatarUrl(profile.avatar_url ?? null);
        }}
      />
    </header>
  );
}