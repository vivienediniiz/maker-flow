"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Bell, AlertTriangle, Clock3, type LucideIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { trialDaysRemaining } from "@/lib/trial";
import { QUOTE_SOURCE_LABELS, QUOTE_SOURCE_ICONS, formatOrderNumber } from "@/lib/quotes";
import type { QuoteSource } from "@/lib/types";

const SEEN_KEY = "sm_notif_last_seen";
const LOOKBACK_DAYS = 7;
const TRIAL_WARNING_DAYS = 3;
const LOW_STOCK_WEIGHT_G = 150;
const LOW_STOCK_PERCENT = 15;

interface Alert {
  id: string;
  icon: LucideIcon;
  text: string;
  isNew: boolean;
  href: string;
}

export function NotificationsBell() {
  const supabase = createClient();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [hasUnseen, setHasUnseen] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    loadAlerts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!open || !btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    setPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
    window.localStorage.setItem(SEEN_KEY, new Date().toISOString());
    setHasUnseen(false);
  }, [open]);

  async function loadAlerts() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoaded(true);
      return;
    }

    const lastSeenRaw = window.localStorage.getItem(SEEN_KEY);
    const lookbackCutoff = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
    const lastSeen = lastSeenRaw ? new Date(lastSeenRaw) : lookbackCutoff;

    const [{ data: profile }, { data: filaments }, { data: quotes }] = await Promise.all([
      supabase
        .from("profiles")
        .select("subscription_tier, subscription_status, trial_ends_at")
        .eq("id", user.id)
        .single(),
      supabase
        .from("filaments")
        .select("id, brand, material, remaining_weight_g, weight_total_g")
        .eq("user_id", user.id),
      supabase
        .from("quotes")
        .select("id, order_number, source, created_at")
        .eq("user_id", user.id)
        .neq("source", "manual")
        .gte("created_at", lookbackCutoff.toISOString())
        .order("created_at", { ascending: false })
        .limit(8),
    ]);

    const list: Alert[] = [];
    let unseen = false;

    if (profile) {
      const daysRemaining = trialDaysRemaining(profile.trial_ends_at);
      const inTrial = profile.subscription_tier !== "free" && profile.subscription_status !== "active" && daysRemaining > 0;
      if (inTrial && daysRemaining <= TRIAL_WARNING_DAYS) {
        list.push({
          id: "trial",
          icon: Clock3,
          text: `Seu período de teste termina em ${daysRemaining} ${daysRemaining === 1 ? "dia" : "dias"} — assine pra não perder o acesso.`,
          isNew: true,
          href: "/pricing",
        });
        unseen = true;
      }
    }

    const lowFilaments = (filaments ?? []).filter((f) => {
      const total = f.weight_total_g > 0 ? f.weight_total_g : 1000;
      const fillPercent = (f.remaining_weight_g / total) * 100;
      return f.remaining_weight_g < LOW_STOCK_WEIGHT_G || fillPercent < LOW_STOCK_PERCENT;
    });
    if (lowFilaments.length > 0) {
      const first = lowFilaments[0];
      list.push({
        id: "low-stock",
        icon: AlertTriangle,
        text:
          lowFilaments.length === 1
            ? `${first.material} — ${first.brand} está com estoque baixo (${first.remaining_weight_g}g restantes).`
            : `${lowFilaments.length} filamentos com estoque baixo.`,
        isNew: true,
        href: "/dashboard/registrations",
      });
      unseen = true;
    }

    for (const q of quotes ?? []) {
      const isNew = new Date(q.created_at) > lastSeen;
      const source = q.source as QuoteSource;
      list.push({
        id: `quote-${q.id}`,
        icon: QUOTE_SOURCE_ICONS[source] ?? Bell,
        text: `Novo pedido via ${QUOTE_SOURCE_LABELS[source] ?? source} — ${formatOrderNumber(q.order_number)}`,
        isNew,
        href: "/dashboard/orders",
      });
      if (isNew) unseen = true;
    }

    setAlerts(list);
    setHasUnseen(unseen);
    setLoaded(true);
  }

  return (
    <>
      <button
        ref={btnRef}
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-border-glass bg-white/[0.03] text-text-secondary hover:text-text-primary"
        aria-label="Notificações"
      >
        <Bell size={16} />
        {hasUnseen && <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-neon-pink" />}
      </button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[9998]" onClick={() => setOpen(false)} />
            <div
              className="glass-card fixed z-[9999] max-h-96 w-80 overflow-y-auto scrollbar-glass p-1 shadow-neon-glow"
              style={{ top: pos.top, right: pos.right }}
            >
              <p className="px-3 py-2 text-xs font-semibold text-text-muted">Alertas</p>
              {!loaded ? (
                <p className="px-3 py-6 text-center text-xs text-text-muted">Carregando...</p>
              ) : alerts.length === 0 ? (
                <p className="px-3 py-6 text-center text-xs text-text-muted">Nenhum alerta no momento.</p>
              ) : (
                alerts.map(({ id, icon: Icon, text, isNew, href }) => (
                  <button
                    key={id}
                    onClick={() => {
                      setOpen(false);
                      router.push(href);
                    }}
                    className="flex w-full items-start gap-2.5 rounded-lg px-3 py-2.5 text-left text-xs text-text-secondary hover:bg-white/5 hover:text-text-primary"
                  >
                    <Icon size={14} className="mt-0.5 shrink-0 text-neon-pink" />
                    <span className="flex-1">{text}</span>
                    {isNew && <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-neon-pink" />}
                  </button>
                ))
              )}
            </div>
          </>,
          document.body
        )}
    </>
  );
}
