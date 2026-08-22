"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { isFilamentLow } from "@/lib/filaments";
import { cn } from "@/lib/utils";
import { Clock, Disc3, Truck, ShieldAlert, CheckCircle2, Loader2, type LucideIcon } from "lucide-react";

interface AlertCardData {
  key: string;
  href: string;
  icon: LucideIcon;
  title: string;
  urgent: boolean;
  primaryText: string;
  secondaryText: string | null;
}

function daysSince(iso: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000));
}

function daysUntil(iso: string) {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000));
}

function plural(n: number, singular: string, pluralForm: string) {
  return n === 1 ? singular : pluralForm;
}

function AlertCard({ data }: { data: AlertCardData }) {
  const Icon = data.urgent ? data.icon : CheckCircle2;
  return (
    <Link
      href={data.href}
      className={cn(
        "glass-card flex flex-col items-center justify-center gap-1.5 px-3 py-4 text-center transition-colors hover:bg-white/[0.04]",
        data.urgent ? "border-amber-500/30 hover:border-amber-500/50" : "hover:border-neon-pink/40"
      )}
    >
      <span
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/5",
          data.urgent ? "text-amber-400" : "text-neon-green"
        )}
      >
        <Icon size={15} />
      </span>
      <span className="text-[10px] font-medium uppercase tracking-wider text-text-muted">{data.title}</span>
      <p className={cn("text-sm font-semibold", data.urgent ? "text-text-primary" : "text-text-secondary")}>
        {data.primaryText}
      </p>
      {data.secondaryText && <p className="text-[10px] leading-snug text-text-muted">{data.secondaryText}</p>}
    </Link>
  );
}

export function PriorityAlertsSection() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<{ count: number; oldestDays: number | null }>({ count: 0, oldestDays: null });
  const [lowFilament, setLowFilament] = useState<{ count: number; worst: { label: string; remaining: number } | null }>({
    count: 0,
    worst: null,
  });
  const [awaitingShipment, setAwaitingShipment] = useState<{ count: number; oldestDays: number | null }>({
    count: 0,
    oldestDays: null,
  });
  const [warranty, setWarranty] = useState<{ count: number; mostUrgent: { model: string; daysLeft: number } | null }>({
    count: 0,
    mostUrgent: null,
  });

  useEffect(() => {
    (async () => {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const today = new Date().toISOString().slice(0, 10);
      const in30Days = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

      const [{ data: sentQuotes }, { data: filaments }, { data: unshipped }, { data: printerAssets }] = await Promise.all([
        supabase
          .from("quotes")
          .select("sent_at")
          .eq("user_id", user.id)
          .eq("status", "sent")
          .order("sent_at", { ascending: true }),
        supabase
          .from("filaments")
          .select("brand, material, remaining_weight_g, weight_total_g, low_stock_threshold_g")
          .eq("user_id", user.id),
        supabase
          .from("quotes")
          .select("sent_at")
          .eq("user_id", user.id)
          .in("status", ["paid", "in_production"])
          .is("shipping_tracking_code", null)
          .order("sent_at", { ascending: true }),
        supabase
          .from("printer_assets")
          .select("model, warranty_expiry_date")
          .eq("user_id", user.id)
          .not("warranty_expiry_date", "is", null)
          .gte("warranty_expiry_date", today)
          .lte("warranty_expiry_date", in30Days)
          .order("warranty_expiry_date", { ascending: true }),
      ]);

      const sentRows = sentQuotes ?? [];
      setPending({
        count: sentRows.length,
        oldestDays: sentRows.length > 0 ? daysSince(sentRows[0].sent_at) : null,
      });

      const lowRows = (filaments ?? [])
        .filter(isFilamentLow)
        .sort((a, b) => a.remaining_weight_g - b.remaining_weight_g);
      setLowFilament({
        count: lowRows.length,
        worst: lowRows.length > 0 ? { label: `${lowRows[0].material} ${lowRows[0].brand}`, remaining: lowRows[0].remaining_weight_g } : null,
      });

      const unshippedRows = unshipped ?? [];
      setAwaitingShipment({
        count: unshippedRows.length,
        oldestDays: unshippedRows.length > 0 ? daysSince(unshippedRows[0].sent_at) : null,
      });

      const warrantyRows = printerAssets ?? [];
      setWarranty({
        count: warrantyRows.length,
        mostUrgent:
          warrantyRows.length > 0
            ? { model: warrantyRows[0].model, daysLeft: daysUntil(warrantyRows[0].warranty_expiry_date) }
            : null,
      });

      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-6 text-text-muted">
        <Loader2 size={18} className="animate-spin" />
      </div>
    );
  }

  const cards: AlertCardData[] = [
    {
      key: "pending",
      href: "/dashboard/orders?status=sent",
      icon: Clock,
      title: "Orçamentos Pendentes",
      urgent: pending.count > 0,
      primaryText: pending.count > 0 ? `${pending.count} ${plural(pending.count, "pendente", "pendentes")}` : "Nenhum orçamento pendente",
      secondaryText:
        pending.oldestDays != null ? `o mais antigo há ${pending.oldestDays} ${plural(pending.oldestDays, "dia", "dias")}` : null,
    },
    {
      key: "filament",
      href: "/dashboard/filaments",
      icon: Disc3,
      title: "Filamento com Estoque Baixo",
      urgent: lowFilament.count > 0,
      primaryText:
        lowFilament.count > 0
          ? `${lowFilament.count} ${plural(lowFilament.count, "filamento baixo", "filamentos baixos")}`
          : "Estoque de filamento OK",
      secondaryText: lowFilament.worst ? `${lowFilament.worst.label} com ${lowFilament.worst.remaining}g restantes` : null,
    },
    {
      key: "shipment",
      href: "/dashboard/orders?status=awaiting_shipment",
      icon: Truck,
      title: "Aguardando Envio",
      urgent: awaitingShipment.count > 0,
      primaryText:
        awaitingShipment.count > 0 ? `${awaitingShipment.count} aguardando envio` : "Nada aguardando envio",
      secondaryText:
        awaitingShipment.oldestDays != null
          ? `o mais antigo há ${awaitingShipment.oldestDays} ${plural(awaitingShipment.oldestDays, "dia", "dias")}`
          : null,
    },
    {
      key: "warranty",
      href: "/dashboard/registrations",
      icon: ShieldAlert,
      title: "Garantia de Impressora",
      urgent: warranty.count > 0,
      primaryText:
        warranty.count > 0
          ? `${warranty.count} ${plural(warranty.count, "impressora", "impressoras")}`
          : "Nenhuma garantia vencendo",
      secondaryText: warranty.mostUrgent
        ? `garantia da ${warranty.mostUrgent.model} vence em ${warranty.mostUrgent.daysLeft} ${plural(warranty.mostUrgent.daysLeft, "dia", "dias")}`
        : null,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {cards.map((c) => (
        <AlertCard key={c.key} data={c} />
      ))}
    </div>
  );
}
