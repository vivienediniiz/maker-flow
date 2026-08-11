import Link from "next/link";
import {
  Zap,
  Gauge,
  Calculator,
  ClipboardList,
  Boxes,
  BarChart3,
  Truck,
  ArrowRight,
} from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";

const FEATURES = [
  {
    icon: Gauge,
    title: "Farm em tempo real",
    description: "Acompanhe todas as suas impressoras, progresso e temperaturas em um só painel.",
  },
  {
    icon: Calculator,
    title: "Calculadora inteligente",
    description: "Precifique por peso, tempo, energia e mão de obra — com múltiplas mesas de uma vez.",
  },
  {
    icon: ClipboardList,
    title: "Gestão de pedidos",
    description: "Do orçamento à entrega, com alertas de prazo e atualização direto pelo WhatsApp.",
  },
  {
    icon: Boxes,
    title: "Estoque 3D",
    description: "Controle peças prontas por localização física, com baixa rápida de vendas.",
  },
  {
    icon: BarChart3,
    title: "Insights & BI",
    description: "Descubra seu produto mais lucrativo, cliente top e filamento mais usado.",
  },
  {
    icon: Truck,
    title: "Frete integrado",
    description: "Cote Correios, Jadlog e Loggi sem sair da plataforma via Melhor Envio.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between px-6 py-6 md:px-12">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-neon-gradient shadow-neon-glow">
            <Zap size={18} className="text-white" />
          </div>
          <span className="font-display text-lg tracking-wide">MakerFlow</span>
        </div>
        <nav className="flex items-center gap-6">
          <Link href="/pricing" className="hidden text-sm text-text-secondary hover:text-text-primary sm:block">
            Planos
          </Link>
          <Link href="/login" className="text-sm text-text-secondary hover:text-text-primary">
            Entrar
          </Link>
          <Link
            href="/signup"
            className="rounded-pill border border-border-glassStrong px-4 py-2 text-sm font-medium hover:bg-white/5"
          >
            Criar conta
          </Link>
        </nav>
      </header>

      <main className="px-6 pt-16 text-center md:px-12 md:pt-24">
        <h1 className="mx-auto max-w-3xl font-display text-4xl leading-tight md:text-6xl">
          Precifique, produza e venda —{" "}
          <span className="neon-text">tudo em um farm de dados só seu</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-text-secondary">
          Gestão completa para estúdios de impressão 3D: orçamentos inteligentes, pedidos,
          estoque e insights financeiros em tempo real.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link href="/pricing" className="neon-btn">
            Ver planos <ArrowRight size={16} />
          </Link>
          <Link
            href="/signup"
            className="rounded-pill border border-border-glassStrong px-6 py-3 text-sm font-semibold hover:bg-white/5"
          >
            Começar grátis
          </Link>
        </div>

        <div className="mx-auto mt-16 max-w-4xl">
          <GlassCard padding="lg" className="text-left shadow-neon-glow">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { label: "Faturamento Mensal", value: "R$ 8.320" },
                { label: "Lucro Líquido", value: "R$ 5.210" },
                { label: "Filamento em Kg", value: "14.6 kg" },
                { label: "Status do Farm", value: "2/4 ativas" },
              ].map((kpi) => (
                <div key={kpi.label} className="glass-card p-4">
                  <p className="text-[10px] uppercase tracking-wider text-text-muted">{kpi.label}</p>
                  <p className="font-numeric mt-1 text-lg font-semibold">{kpi.value}</p>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      </main>

      <section className="mx-auto mt-24 max-w-5xl px-6 md:px-12">
        <h2 className="text-center font-display text-3xl">
          Feito para quem vive de <span className="neon-text">impressão 3D</span>
        </h2>
        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <GlassCard key={f.title} hover padding="md" className="space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neon-gradient-soft text-neon-pink">
                <f.icon size={18} />
              </div>
              <p className="font-display text-base">{f.title}</p>
              <p className="text-sm text-text-secondary">{f.description}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      <section className="mx-auto my-24 max-w-4xl px-6 md:px-12">
        <GlassCard padding="lg" className="flex flex-col items-center gap-4 py-14 text-center shadow-neon-glow">
          <h2 className="font-display text-3xl">Pronto pra organizar seu farm?</h2>
          <p className="max-w-md text-text-secondary">
            Planos a partir de R$ 29/mês. Sem fidelidade, cancele quando quiser.
          </p>
          <Link href="/pricing" className="neon-btn">
            Ver planos e assinar <ArrowRight size={16} />
          </Link>
        </GlassCard>
      </section>

      <footer className="border-t border-border-glass px-6 py-8 text-center text-xs text-text-muted md:px-12">
        © 2026 MakerFlow. Feito para a comunidade Maker.
      </footer>
    </div>
  );
}