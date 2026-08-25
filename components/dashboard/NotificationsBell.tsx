"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Bell, AlertTriangle, Clock3, Clock, type LucideIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { trialDaysRemaining } from "@/lib/trial";
import {
  QUOTE_SOURCE_LABELS,
  QUOTE_SOURCE_ICONS,
  formatOrderNumber,
  isProductionDeadlineDue,
  daysUntilProductionDeadline,
  PRODUCTION_DEADLINE_WARNING_DAYS,
} from "@/lib/quotes";
import { isFilamentLow } from "@/lib/filaments";
import type { QuoteSource } from "@/lib/types";

const SEEN_KEY = "sm_notif_last_seen";
const LOOKBACK_DAYS = 7;
const TRIAL_WARNING_DAYS = 3;

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

    const deadlineCutoff = new Date();
    deadlineCutoff.setDate(deadlineCutoff.getDate() + PRODUCTION_DEADLINE_WARNING_DAYS);
    const deadlineCutoffStr = deadlineCutoff.toISOString().slice(0, 10);

    const [{ data: profile }, { data: filaments }, { data: quotes }, { data: deadlineQuotes }] = await Promise.all([
      supabase
        .from("profiles")
        .select("subscription_tier, subscription_status, trial_ends_at")
        .eq("id", user.id)
        .single(),
      supabase
        .from("filaments")
        .select("id, brand, material, remaining_weight_g, weight_total_g, low_stock_threshold_g")
        .eq("user_id", user.id),
      supabase
        .from("quotes")
        .select("id, order_number, source, created_at")
        .eq("user_id", user.id)
        .neq("source", "manual")
        .gte("created_at", lookbackCutoff.toISOString())
        .order("created_at", { ascending: false })
        .limit(8),
      supabase
        .from("quotes")
        .select("id, project_name, production_deadline_date, status")
        .eq("user_id", user.id)
        .not("production_deadline_date", "is", null)
        .in("status", ["sent", "awaiting_payment", "paid", "in_production"])
        .lte("production_deadline_date", deadlineCutoffStr)
        .order("production_deadline_date", { ascending: true })
        .limit(5),
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

    const lowFilaments = (filaments ?? []).filter(isFilamentLow);
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
        href: "/dashboard/filaments",
      });
      unseen = true;
    }

    for (const q of deadlineQuotes ?? []) {
      if (!q.production_deadline_date || !isProductionDeadlineDue(q.status, q.production_deadline_date)) continue;
      const days = daysUntilProductionDeadline(q.production_deadline_date);
      list.push({
        id: `deadline-${q.id}`,
        icon: Clock,
        text:
          days < 0
            ? `${q.project_name} — prazo de produção atrasado (${Math.abs(days)} ${Math.abs(days) === 1 ? "dia" : "dias"}).`
            : days === 0
              ? `${q.project_name} — prazo de produção vence hoje.`
              : `${q.project_name} — prazo de produção vence em ${days} ${days === 1 ? "dia" : "dias"}.`,
        isNew: true,
        href: "/dashboard/orders",
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
