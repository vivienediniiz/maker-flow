"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { isFilamentLow } from "@/lib/filaments";
import { isProductionDeadlineDue, daysUntilProductionDeadline } from "@/lib/quotes";
import { cn } from "@/lib/utils";
import { Clock, Disc3, Truck, ShieldAlert, CheckCircle2, Loader2, PackageX, CalendarClock, type LucideIcon } from "lucide-react";

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
      className="group flex flex-col items-center gap-2 px-2 py-3 text-center transition-transform hover:-translate-y-0.5"
    >
      <span
        className={cn(
          "flex h-20 w-20 shrink-0 items-center justify-center rounded-full p-[3px] transition-shadow",
          data.urgent ? "bg-neon-gradient shadow-neon-glow" : "bg-neon-gradient-soft group-hover:shadow-neon-glow"
        )}
      >
        <span className="flex h-full w-full items-center justify-center rounded-full bg-bg-raised">
          <Icon size={24} className={data.urgent ? "text-white" : "text-neon-green"} />
        </span>
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
  const [productionDeadline, setProductionDeadline] = useState<{
    count: number;
    mostUrgent: { name: string; days: number } | null;
  }>({ count: 0, mostUrgent: null });
  const [lowStockProducts, setLowStockProducts] = useState<{
    count: number;
    worst: { name: string; stock: number } | null;
  }>({ count: 0, worst: null });

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

      const [{ data: sentQuotes }, { data: filaments }, { data: unshipped }, { data: printerAssets }, { data: deadlineQuotes }, { data: lowStockRows }] =
        await Promise.all([
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
          supabase
            .from("quotes")
            .select("project_name, status, production_deadline_date")
            .eq("user_id", user.id)
            .not("production_deadline_date", "is", null)
            .in("status", ["sent", "awaiting_payment", "paid", "in_production"])
            .order("production_deadline_date", { ascending: true }),
          supabase
            .from("products")
            .select("name, stock_quantity")
            .eq("user_id", user.id)
            .lt("stock_quantity", 2)
            .order("stock_quantity", { ascending: true }),
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

      const deadlineRows = (deadlineQuotes ?? [])
        .filter((q) => isProductionDeadlineDue(q.status, q.production_deadline_date))
        .sort((a, b) => daysUntilProductionDeadline(a.production_deadline_date!) - daysUntilProductionDeadline(b.production_deadline_date!));
      setProductionDeadline({
        count: deadlineRows.length,
        mostUrgent:
          deadlineRows.length > 0
            ? { name: deadlineRows[0].project_name, days: daysUntilProductionDeadline(deadlineRows[0].production_deadline_date!) }
            : null,
      });

      const lowStockRowsData = lowStockRows ?? [];
      setLowStockProducts({
        count: lowStockRowsData.length,
        worst: lowStockRowsData.length > 0 ? { name: lowStockRowsData[0].name, stock: lowStockRowsData[0].stock_quantity } : null,
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
      key: "product-stock",
      href: "/dashboard/inventory",
      icon: PackageX,
      title: "Produto com Estoque Baixo",
      urgent: lowStockProducts.count > 0,
      primaryText:
        lowStockProducts.count > 0
          ? `${lowStockProducts.count} ${plural(lowStockProducts.count, "produto baixo", "produtos baixos")}`
          : "Estoque de produtos OK",
      secondaryText: lowStockProducts.worst
        ? `${lowStockProducts.worst.name} com ${lowStockProducts.worst.stock} ${plural(lowStockProducts.worst.stock, "unidade", "unidades")}`
        : null,
    },
    {
      key: "production-deadline",
      href: "/dashboard/orders",
      icon: CalendarClock,
      title: "Prazo de Produção",
      urgent: productionDeadline.count > 0,
      primaryText:
        productionDeadline.count > 0
          ? `${productionDeadline.count} ${plural(productionDeadline.count, "pedido a vencer", "pedidos a vencer")}`
          : "Nenhum prazo vencendo",
      secondaryText: productionDeadline.mostUrgent
        ? productionDeadline.mostUrgent.days < 0
          ? `${productionDeadline.mostUrgent.name} venceu há ${Math.abs(productionDeadline.mostUrgent.days)} ${plural(Math.abs(productionDeadline.mostUrgent.days), "dia", "dias")}`
          : productionDeadline.mostUrgent.days === 0
            ? `${productionDeadline.mostUrgent.name} vence hoje`
            : `${productionDeadline.mostUrgent.name} vence em ${productionDeadline.mostUrgent.days} ${plural(productionDeadline.mostUrgent.days, "dia", "dias")}`
        : null,
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
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
      {cards.map((c) => (
        <AlertCard key={c.key} data={c} />
      ))}
    </div>
  );
}
