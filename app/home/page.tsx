import Link from "next/link";
import {
  ArrowRight,
  Calculator,
  ShoppingBag,
  Disc3,
  Printer,
  LineChart,
  Truck,
  Tag,
  BarChart3,
  Users,
  Boxes,
  FolderCog,
  Sparkles,
  Wallet,
  LayoutGrid,
  Check,
  X,
} from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassAccordion } from "@/components/ui/GlassAccordion";
import { AppLogo } from "@/components/ui/AppLogo";
import { BrowserFrame } from "@/components/marketing/BrowserFrame";
import { LandingHero } from "@/components/marketing/LandingHero";
import { HowItWorksSection } from "@/components/marketing/HowItWorksSection";
import { StoreShowcaseSection } from "@/components/marketing/StoreShowcaseSection";
import { ScreensShowcaseSection } from "@/components/marketing/ScreensShowcaseSection";
import { LiveCalculatorSection } from "@/components/marketing/LiveCalculatorSection";
import { Reveal, RevealGroup, RevealItem } from "@/components/marketing/motion/Reveal";
import { AnimatedHeading } from "@/components/marketing/motion/AnimatedHeading";
import { Parallax } from "@/components/marketing/motion/Parallax";
import { ScrollProgress } from "@/components/marketing/motion/ScrollProgress";
import { SalesMockup } from "@/components/marketing/mockups/SalesMockup";
import { FilamentShelfMockup } from "@/components/marketing/mockups/FilamentShelfMockup";
import { PrintersMockup } from "@/components/marketing/mockups/PrintersMockup";
import { FinanceMockup } from "@/components/marketing/mockups/FinanceMockup";
import { ShippingMockup } from "@/components/marketing/mockups/ShippingMockup";
import { InsightsMockup } from "@/components/marketing/mockups/InsightsMockup";
import { PLANS, getCyclePricing } from "@/lib/plans";
import { formatBRL } from "@/lib/utils";

const PROBLEMS = [
  {
    icon: Calculator,
    title: "Preço no chute",
    description:
      "Você calcula o custo de cada peça numa planilha (ou de cabeça) e nunca tem certeza se aquele valor cobre filamento, energia, insumos e a sua hora de trabalho. No fim do mês, o lucro real é um mistério.",
  },
  {
    icon: ShoppingBag,
    title: "Pedido espalhado",
    description:
      "Uma venda chega pelo Mercado Livre, outra pela Shopee, outra pelo TikTok Shop, outra só no WhatsApp. Cada uma num lugar — sem painel único, é fácil duplicar produção, perder prazo ou esquecer de entregar.",
  },
  {
    icon: Disc3,
    title: "Filamento acaba sem avisar",
    description:
      "O rolo esvazia no meio da impressão e ninguém percebeu. Sem controle visual de estoque por cor e material, a mesa para e o prazo do cliente atrasa.",
  },
  {
    icon: Truck,
    title: "Frete calculado no olho",
    description:
      "Cotar frete manualmente pra cada pedido, direto no site da transportadora, é tempo que você não tem — e errar a cotação come sua margem inteira.",
  },
];

const FEATURES = [
  {
    icon: ShoppingBag,
    title: "Vendas Multicanal",
    description:
      "Mercado Livre, Mercado Pago, Shopee e TikTok Shop sincronizam sozinhos: pedido novo em qualquer uma dessas plataformas cai automaticamente em Vendas, sem importar nada. Fez venda pelo WhatsApp ou Instagram? Cadastra manual em segundos. Tudo no mesmo painel, com filtro por canal e status.",
    frameTitle: "studiomaker3d.com.br/orders",
    Mockup: SalesMockup,
  },
  {
    icon: Disc3,
    title: "Prateleira de Filamentos",
    description:
      "Estoque visual, por combinação real de marca, material e cor — cada carretel mostra o nível de sobra em tempo real. Alerta automático quando um rolo tá acabando, e histórico completo de toda compra e todo consumo.",
    frameTitle: "studiomaker3d.com.br/filaments",
    Mockup: FilamentShelfMockup,
  },
  {
    icon: Printer,
    title: "Controle Patrimonial de Impressoras",
    description:
      "Cada impressora do seu farm cadastrada com data de compra, valor pago, nota fiscal, garantia e histórico de manutenção. Não é só ver status de impressão — é saber quanto cada máquina custou e quando vence a garantia.",
    frameTitle: "studiomaker3d.com.br/registrations",
    Mockup: PrintersMockup,
  },
  {
    icon: LineChart,
    title: "Financeiro Completo",
    description:
      "Receita bruta, custos totais e lucro líquido real — sem estimativa. Lance despesas fixas, insumos e compras extras, e veja o lucro de verdade mês a mês, com gráfico de evolução e exportação em CSV.",
    frameTitle: "studiomaker3d.com.br/finance",
    Mockup: FinanceMockup,
  },
  {
    icon: Truck,
    title: "Frete Integrado",
    description:
      "Cote o frete direto no painel, sem abrir outro site. Com o Melhor Envio conectado, você emite a etiqueta e o rastreio já entra automaticamente na venda — inclusive pra avisar o cliente pelo WhatsApp assim que o pedido sair.",
    frameTitle: "studiomaker3d.com.br/shipping",
    Mockup: ShippingMockup,
  },
  {
    icon: BarChart3,
    title: "Insights & BI",
    description:
      "Produto mais lucrativo, cliente que mais compra, filamento mais usado, taxa de recompra — tudo calculado a partir das suas vendas reais, pra decidir o que produzir e pra quem vender com dado, não achismo.",
    frameTitle: "studiomaker3d.com.br/insights",
    Mockup: InsightsMockup,
  },
];

const EXTRA_FEATURES = [
  {
    icon: Tag,
    title: "Cupons e Campanhas",
    description: "Crie cupons pra lançamento ou venda em grupo e acompanhe o retorno de cada campanha.",
  },
  {
    icon: Users,
    title: "Clientes",
    description: "Cadastro e histórico de compras de cada cliente, pronto pra puxar no orçamento seguinte.",
  },
  {
    icon: Boxes,
    title: "Estoque 3D",
    description: "Controle de peças prontas e pronta-entrega, separado do estoque de filamento.",
  },
  {
    icon: FolderCog,
    title: "Cadastros centralizados",
    description: "Impressoras, insumos, compras extras, cupons, filiais e categorias, tudo num só lugar.",
  },
];

const FREE_FEATURES = [
  "5 orçamentos/vendas por mês",
  "Até 15 clientes e 10 produtos",
  "Até 5 rolos de filamento",
  "1 impressora e 1 filial (matriz)",
  "PDF de orçamento com marca d'água",
];

const BEFORE_AFTER = {
  before: [
    "Cálculo manual, fórmula que só quem criou entende",
    "Orçamento em texto solto no WhatsApp",
    "Sem histórico do que cada cliente já comprou",
    "Filamento acaba no meio da impressão sem avisar",
    "Lucro só aparece (ou não) no fim do mês",
  ],
  after: [
    "Custo calculado automaticamente — filamento, energia e mão de obra, mesa a mesa",
    "Orçamento em PDF profissional, pronto pra enviar por link ou WhatsApp",
    "Histórico completo de cada cliente, pronto pra puxar no orçamento seguinte",
    "Estoque de filamento com alerta antes de acabar",
    "Lucro real por venda, sem esperar o fim do mês",
  ],
};

const WHY_US = [
  {
    icon: Sparkles,
    title: "Feito por quem vive a rotina",
    description:
      "StudioMaker não nasceu numa mesa de produto genérica — nasceu da rotina real de imprimir, embalar e vender peça 3D todo dia. Cada tela resolve um problema que a gente realmente teve.",
  },
  {
    icon: Wallet,
    title: "Custo real, não estimativa",
    description:
      "O preço sugerido soma filamento, energia, insumos e mão de obra de verdade — não é uma média de mercado nem um chute. É o seu custo, com os seus números.",
  },
  {
    icon: LayoutGrid,
    title: "Todos os canais, um painel só",
    description:
      "Mercado Livre, Mercado Pago, Shopee, TikTok Shop e vendas manuais no mesmo lugar. Sem pular de aba pra saber o que já vendeu.",
  },
];

const FAQ = [
  {
    question: "Preciso saber programar ou entender de tecnologia?",
    answer:
      "Não. O StudioMaker foi pensado pra quem faz e vende peça 3D no dia a dia, não pra quem entende de sistema. Você cadastra sua impressora, seus filamentos e já começa a orçar — sem instalação nem configuração complicada.",
  },
  {
    question: "Funciona com qualquer impressora?",
    answer:
      "Sim. O cadastro de impressoras é de controle patrimonial (modelo, valor pago, garantia, histórico de manutenção) e funciona com qualquer marca ou modelo — você não precisa conectar a impressora fisicamente pra usar a Calculadora, o Financeiro ou as Vendas.",
  },
  {
    question: "Como funciona o período de teste?",
    answer:
      "Toda conta nova recebe 14 dias de acesso completo aos recursos pagos, sem precisar cadastrar cartão. Depois desse período, se você não assinar um plano, a conta continua funcionando no plano Grátis, só que com alguns limites.",
  },
  {
    question: "Quais plataformas de venda dá pra conectar?",
    answer:
      "Mercado Pago e Mercado Livre já conectam via um clique em Integrações. Shopee e TikTok Shop estão prontos no sistema, aguardando aprovação do app nas respectivas plataformas — assim que liberar, é só conectar.",
  },
  {
    question: "O que acontece quando eu bato o limite de orçamentos do mês?",
    answer:
      "No plano Grátis são 5 orçamentos/vendas por mês, no Starter 50 — o contador reseta todo dia 1º. Ao chegar no limite, você não perde nada que já criou: só precisa esperar o próximo mês ou assinar/fazer upgrade pra continuar criando na hora. No Pro não tem limite.",
  },
  {
    question: "Posso cancelar quando quiser?",
    answer:
      "Sim, não tem fidelidade. Cancelando a assinatura por cartão, você continua com acesso até o fim do período já pago e depois volta pro plano Grátis automaticamente — seus dados continuam salvos.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <ScrollProgress />
      <header className="sticky top-0 z-40 border-b border-border-glass bg-bg/80 backdrop-blur-xl">
        <div className="flex items-center justify-between px-4 py-4 sm:px-6 md:px-12">
          <AppLogo iconClassName="h-8 w-8 sm:h-9 sm:w-9" textClassName="font-display text-base tracking-wide sm:text-lg" />
          <nav className="hidden items-center gap-6 sm:flex">
            <a href="#ferramentas" className="text-sm text-text-secondary hover:text-text-primary">
              Ferramentas
            </a>
            <a href="#planos" className="text-sm text-text-secondary hover:text-text-primary">
              Preços
            </a>
            <a href="#faq" className="text-sm text-text-secondary hover:text-text-primary">
              FAQ
            </a>
          </nav>
          <div className="flex items-center gap-3 sm:gap-4">
            <Link href="/login" className="whitespace-nowrap text-sm text-text-secondary hover:text-text-primary">
              Entrar
            </Link>
            <Link
              href="/signup"
              className="whitespace-nowrap rounded-pill border border-border-glassStrong px-3 py-1.5 text-xs font-medium hover:bg-white/5 sm:px-4 sm:py-2 sm:text-sm"
            >
              Criar conta
            </Link>
          </div>
        </div>
      </header>

      <LandingHero />

      <HowItWorksSection />

      <StoreShowcaseSection />

      {/* O Problema */}
      <section className="mx-auto mt-28 max-w-5xl px-6 md:px-12">
        <div className="mx-auto max-w-2xl text-center">
          <AnimatedHeading
            className="font-display text-3xl md:text-4xl"
            segments={["Você não abriu um estúdio de impressão 3D pra virar", { text: "contador", neon: true }]}
          />
          <Reveal delay={0.15}>
            <p className="mt-4 text-text-secondary">
              Mas sem controle real de custo, estoque e vendas, é exatamente isso que a rotina vira — e a margem some
              no processo.
            </p>
          </Reveal>
        </div>
        <RevealGroup className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2">
          {PROBLEMS.map((p) => (
            <RevealItem key={p.title}>
              <GlassCard padding="md" className="h-full space-y-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neon-gradient-soft text-neon-pink">
                  <p.icon size={18} />
                </div>
                <p className="font-display text-base">{p.title}</p>
                <p className="text-sm leading-relaxed text-text-secondary">{p.description}</p>
              </GlassCard>
            </RevealItem>
          ))}
        </RevealGroup>
      </section>

      {/* Funcionalidades */}
      <section id="ferramentas" className="mx-auto mt-28 max-w-5xl px-6 md:px-12">
        <div className="mx-auto max-w-2xl text-center">
          <AnimatedHeading
            className="font-display text-3xl md:text-4xl"
            segments={["O sistema de verdade,", { text: "funcionando", neon: true }]}
          />
          <Reveal delay={0.15}>
            <p className="mt-4 text-text-secondary">
              Sem mockup genérico — as telas abaixo são o próprio StudioMaker, do jeito que ele roda hoje.
            </p>
          </Reveal>
        </div>

        <div className="mt-16 space-y-20 md:space-y-28">
          {FEATURES.map((f, i) => (
            <div key={f.title} className="grid grid-cols-1 items-center gap-8 md:grid-cols-2 md:gap-12">
              {/* O mockup entra pelo lado onde ele está e ainda flutua de leve com o scroll */}
              <Reveal direction={i % 2 === 1 ? "left" : "right"} className={i % 2 === 1 ? "md:order-2" : ""}>
                <Parallax distance={22}>
                  <BrowserFrame title={f.frameTitle}>
                    <f.Mockup />
                  </BrowserFrame>
                </Parallax>
              </Reveal>
              <Reveal
                direction={i % 2 === 1 ? "right" : "left"}
                delay={0.12}
                className={i % 2 === 1 ? "md:order-1" : ""}
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-neon-gradient-soft text-neon-pink">
                  <f.icon size={20} />
                </div>
                <h3 className="font-display mt-4 text-2xl">{f.title}</h3>
                <p className="mt-3 leading-relaxed text-text-secondary">{f.description}</p>
              </Reveal>
            </div>
          ))}
        </div>

        {/* Mais recursos, sem mockup dedicado */}
        <div className="mt-20">
          <Reveal>
            <p className="text-center text-sm uppercase tracking-wider text-text-muted">E também no seu painel</p>
          </Reveal>
          <RevealGroup className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4" stagger={0.08}>
            {EXTRA_FEATURES.map((f) => (
              <RevealItem key={f.title}>
                <GlassCard hover padding="md" className="h-full space-y-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-neon-gradient-soft text-neon-pink">
                    <f.icon size={16} />
                  </div>
                  <p className="font-display text-sm">{f.title}</p>
                  <p className="text-xs leading-relaxed text-text-secondary">{f.description}</p>
                </GlassCard>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </section>

      <LiveCalculatorSection />

      {/* Antes e depois */}
      <section className="mx-auto mt-28 max-w-4xl px-6 md:px-12">
        <div className="mx-auto max-w-2xl text-center">
          <AnimatedHeading
            className="font-display text-3xl md:text-4xl"
            segments={["Sua planilha", { text: "versus", neon: true }, "o Studio Maker"]}
          />
        </div>
        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Reveal direction="right">
            <GlassCard padding="lg" className="h-full space-y-4">
              <p className="font-display text-sm uppercase tracking-wider text-text-muted">Planilha / no achismo</p>
              <ul className="space-y-3">
                {BEFORE_AFTER.before.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-text-secondary">
                    <X size={16} className="mt-0.5 shrink-0 text-text-muted" /> {item}
                  </li>
                ))}
              </ul>
            </GlassCard>
          </Reveal>
          <Reveal direction="left" delay={0.12}>
            <GlassCard padding="lg" className="h-full space-y-4 ring-1 ring-neon-pink/30">
              <p className="font-display text-sm uppercase tracking-wider text-neon-pink">Studio Maker</p>
              <ul className="space-y-3">
                {BEFORE_AFTER.after.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-text-secondary">
                    <Check size={16} className="mt-0.5 shrink-0 text-neon-green" /> {item}
                  </li>
                ))}
              </ul>
            </GlassCard>
          </Reveal>
        </div>
      </section>

      {/* Por que StudioMaker3D */}
      <section className="mx-auto mt-28 max-w-5xl px-6 md:px-12">
        <AnimatedHeading
          className="text-center font-display text-3xl md:text-4xl"
          segments={["Por que", { text: "StudioMaker3D", neon: true }]}
        />
        <RevealGroup className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-3" stagger={0.1}>
          {WHY_US.map((w) => (
            <RevealItem key={w.title}>
              <GlassCard padding="lg" className="h-full space-y-3 text-center">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-neon-gradient-soft text-neon-pink">
                  <w.icon size={20} />
                </div>
                <p className="font-display text-base">{w.title}</p>
                <p className="text-sm leading-relaxed text-text-secondary">{w.description}</p>
              </GlassCard>
            </RevealItem>
          ))}
        </RevealGroup>
      </section>

      <ScreensShowcaseSection />

      {/* Planos */}
      <section id="planos" className="mx-auto mt-28 max-w-5xl px-6 md:px-12">
        <div className="mx-auto max-w-2xl text-center">
          <AnimatedHeading className="font-display text-3xl md:text-4xl" segments={["Planos simples, sem pegadinha"]} />
          <Reveal delay={0.15}>
            <p className="mt-4 text-text-secondary">
              14 dias de acesso completo pra testar tudo, sem pedir cartão. Depois, continue no Grátis pra sempre ou
              assine pra manter tudo liberado. Valores mensais — ciclo anual com desconto disponível na assinatura.
            </p>
          </Reveal>
        </div>
        <RevealGroup className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3" stagger={0.12}>
          <RevealItem className="h-full">
          <GlassCard padding="lg" className="flex h-full flex-col gap-4">
            <div>
              <h3 className="font-display text-xl">Grátis</h3>
              <p className="mt-1 text-sm text-text-secondary">Pra sempre, com limites — dá pra testar o essencial.</p>
            </div>
            <p className="font-numeric text-3xl font-semibold">R$ 0</p>
            <ul className="space-y-2.5 text-sm">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-text-secondary">
                  <Check size={16} className="mt-0.5 shrink-0 text-neon-green" /> {f}
                </li>
              ))}
            </ul>
            <Link
              href="/signup"
              className="mt-auto rounded-pill border border-border-glassStrong px-6 py-3 text-center text-sm font-semibold hover:bg-white/5"
            >
              Começar grátis
            </Link>
          </GlassCard>
          </RevealItem>
          {PLANS.map((plan) => {
            const pricing = getCyclePricing(plan.id, "monthly");
            return (
              <RevealItem key={plan.id} className="h-full">
              <GlassCard
                padding="lg"
                className={`flex h-full flex-col gap-4 ${plan.highlighted ? "shadow-neon-glow ring-1 ring-neon-pink/40" : ""}`}
              >
                {plan.highlighted && (
                  <span className="w-fit rounded-pill bg-neon-gradient px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-white">
                    Mais popular
                  </span>
                )}
                <div>
                  <h3 className="font-display text-xl">{plan.name}</h3>
                  <p className="mt-1 text-sm text-text-secondary">{plan.tagline}</p>
                </div>
                <p className="font-numeric text-3xl font-semibold">
                  {formatBRL(pricing.price)}
                  <span className="text-sm font-normal text-text-muted"> /mês</span>
                </p>
                <ul className="space-y-2.5 text-sm">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-text-secondary">
                      <Check size={16} className="mt-0.5 shrink-0 text-neon-green" /> {f}
                    </li>
                  ))}
                </ul>
                <Link href="/pricing" className="neon-btn mt-auto">
                  Assinar {plan.name}
                </Link>
              </GlassCard>
              </RevealItem>
            );
          })}
        </RevealGroup>
        <Reveal className="mt-8 text-center">
          <Link href="/pricing" className="text-sm text-text-secondary hover:text-text-primary">
            Comparar tudo — mensal, anual e Pix <ArrowRight size={14} className="inline" />
          </Link>
        </Reveal>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto mt-28 max-w-2xl px-6 md:px-12">
        <AnimatedHeading
          className="text-center font-display text-3xl md:text-4xl"
          segments={["Perguntas frequentes"]}
        />
        <RevealGroup className="mt-10 space-y-3" stagger={0.07}>
          {FAQ.map((item) => (
            <RevealItem key={item.question}>
              <GlassAccordion title={item.question}>
                <p className="text-sm text-text-secondary">{item.answer}</p>
              </GlassAccordion>
            </RevealItem>
          ))}
        </RevealGroup>
      </section>

      {/* CTA final */}
      <section className="mx-auto my-28 max-w-4xl px-6 md:px-12">
        <Reveal>
          <GlassCard padding="lg" className="flex flex-col items-center gap-4 py-14 text-center shadow-neon-glow">
            <AnimatedHeading
              className="font-display text-3xl"
              segments={["Pronto pra saber o", { text: "lucro real", neon: true }, "do seu estúdio?"]}
            />
            <Reveal delay={0.25}>
              <p className="max-w-md text-text-secondary">
                Sem cartão de crédito, 14 dias de acesso completo. Depois, você decide se continua.
              </p>
            </Reveal>
            <Reveal delay={0.35}>
              <Link href="/signup" className="neon-btn">
                Começar grátis <ArrowRight size={16} />
              </Link>
            </Reveal>
          </GlassCard>
        </Reveal>
      </section>

      <footer className="flex flex-col items-center gap-3 border-t border-border-glass px-6 py-8 text-center text-xs text-text-muted md:px-12">
        <div className="flex flex-col items-center gap-3 md:w-full md:flex-row md:justify-between">
          <p>© 2026 StudioMaker. Feito para a comunidade Maker.</p>
          <nav className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/privacy-policy" className="hover:text-text-secondary">
              Política de Privacidade
            </Link>
            <Link href="/data-deletion" className="hover:text-text-secondary">
              Exclusão de Dados
            </Link>
            <Link href="/terms" className="hover:text-text-secondary">
              Termos de Uso
            </Link>
            <Link href="/help" className="hover:text-text-secondary">
              Ajuda/FAQ
            </Link>
            <Link href="/feedback" className="hover:text-text-secondary">
              Sugestões e Reclamações
            </Link>
          </nav>
        </div>
        <p className="text-[11px] text-text-muted/60">
          Desenvolvido por{" "}
          <a
            href="https://instagram.com/agencia_diniiz"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-text-secondary"
          >
            Agência Diniz
          </a>{" "}
          — CNPJ 64.411.407/0001-94 — @agencia_diniiz
        </p>
      </footer>
    </div>
  );
}
