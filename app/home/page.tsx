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
} from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassAccordion } from "@/components/ui/GlassAccordion";
import { AppLogo } from "@/components/ui/AppLogo";
import { BrowserFrame } from "@/components/marketing/BrowserFrame";
import { LandingHero } from "@/components/marketing/LandingHero";
import { HowItWorksSection } from "@/components/marketing/HowItWorksSection";
import { StoreShowcaseSection } from "@/components/marketing/StoreShowcaseSection";
import { PLANS, getCyclePricing } from "@/lib/plans";

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
    image: { src: "/landing/vendas.png", alt: "Tela de Vendas com pedidos, status, origem e valores líquidos", width: 1647, height: 646 },
  },
  {
    icon: Disc3,
    title: "Prateleira de Filamentos",
    description:
      "Estoque visual, por combinação real de marca, material e cor — cada carretel mostra o nível de sobra em tempo real. Alerta automático quando um rolo tá acabando, e histórico completo de toda compra e todo consumo.",
    image: { src: "/landing/filamentos.png", alt: "Prateleira de filamentos com nível de estoque por carretel e histórico de movimentações", width: 1634, height: 692 },
  },
  {
    icon: Printer,
    title: "Controle Patrimonial de Impressoras",
    description:
      "Cada impressora do seu farm cadastrada com data de compra, valor pago, nota fiscal, garantia e histórico de manutenção. Não é só ver status de impressão — é saber quanto cada máquina custou e quando vence a garantia.",
    image: { src: "/landing/impressoras.jpg", alt: "Lista de impressoras cadastradas com status e data de compra", width: 1644, height: 472 },
  },
  {
    icon: LineChart,
    title: "Financeiro Completo",
    description:
      "Receita bruta, custos totais e lucro líquido real — sem estimativa. Lance despesas fixas, insumos e compras extras, e veja o lucro de verdade mês a mês, com gráfico de evolução e exportação em CSV.",
    image: { src: "/landing/financeiro.png", alt: "Painel financeiro com receita bruta, custos, lucro líquido e evolução de vendas", width: 1894, height: 904 },
  },
  {
    icon: Truck,
    title: "Frete Integrado",
    description:
      "Cote o frete direto no painel, sem abrir outro site. Com o Melhor Envio conectado, você emite a etiqueta e o rastreio já entra automaticamente na venda — inclusive pra avisar o cliente pelo WhatsApp assim que o pedido sair.",
    image: { src: "/landing/frete.png", alt: "Tela de cálculo de frete com Melhor Envio conectado", width: 1649, height: 417 },
  },
  {
    icon: BarChart3,
    title: "Insights & BI",
    description:
      "Produto mais lucrativo, cliente que mais compra, filamento mais usado, taxa de recompra — tudo calculado a partir das suas vendas reais, pra decidir o que produzir e pra quem vender com dado, não achismo.",
    image: { src: "/landing/insights.png", alt: "Painel de Insights e BI com produto mais lucrativo, cliente top e prateleira de filamentos", width: 1863, height: 900 },
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
    question: "Posso cancelar quando quiser?",
    answer:
      "Sim, não tem fidelidade. Cancelando a assinatura por cartão, você continua com acesso até o fim do período já pago e depois volta pro plano Grátis automaticamente — seus dados continuam salvos.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between px-4 py-6 sm:px-6 md:px-12">
        <AppLogo iconClassName="h-8 w-8 sm:h-9 sm:w-9" textClassName="font-display text-base tracking-wide sm:text-lg" />
        <nav className="flex items-center gap-3 sm:gap-6">
          <Link href="/pricing" className="hidden text-sm text-text-secondary hover:text-text-primary sm:block">
            Planos
          </Link>
          <Link href="/login" className="whitespace-nowrap text-sm text-text-secondary hover:text-text-primary">
            Entrar
          </Link>
          <Link
            href="/signup"
            className="whitespace-nowrap rounded-pill border border-border-glassStrong px-3 py-1.5 text-xs font-medium hover:bg-white/5 sm:px-4 sm:py-2 sm:text-sm"
          >
            Criar conta
          </Link>
        </nav>
      </header>

      <LandingHero />

      <HowItWorksSection />

      <StoreShowcaseSection />

      {/* O Problema */}
      <section className="mx-auto mt-28 max-w-5xl px-6 md:px-12">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl md:text-4xl">
            Você não abriu um estúdio de impressão 3D pra virar <span className="neon-text">contador</span>
          </h2>
          <p className="mt-4 text-text-secondary">
            Mas sem controle real de custo, estoque e vendas, é exatamente isso que a rotina vira — e a margem some
            no processo.
          </p>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2">
          {PROBLEMS.map((p) => (
            <GlassCard key={p.title} padding="md" className="space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neon-gradient-soft text-neon-pink">
                <p.icon size={18} />
              </div>
              <p className="font-display text-base">{p.title}</p>
              <p className="text-sm leading-relaxed text-text-secondary">{p.description}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* Funcionalidades */}
      <section className="mx-auto mt-28 max-w-5xl px-6 md:px-12">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl md:text-4xl">
            O sistema de verdade, <span className="neon-text">funcionando</span>
          </h2>
          <p className="mt-4 text-text-secondary">
            Sem mockup genérico — as telas abaixo são o próprio StudioMaker, do jeito que ele roda hoje.
          </p>
        </div>

        <div className="mt-16 space-y-20 md:space-y-28">
          {FEATURES.map((f, i) => (
            <div key={f.title} className="grid grid-cols-1 items-center gap-8 md:grid-cols-2 md:gap-12">
              <div className={i % 2 === 1 ? "md:order-2" : ""}>
                <BrowserFrame src={f.image.src} alt={f.image.alt} width={f.image.width} height={f.image.height} />
              </div>
              <div className={i % 2 === 1 ? "md:order-1" : ""}>
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-neon-gradient-soft text-neon-pink">
                  <f.icon size={20} />
                </div>
                <h3 className="font-display mt-4 text-2xl">{f.title}</h3>
                <p className="mt-3 leading-relaxed text-text-secondary">{f.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Mais recursos, sem mockup dedicado */}
        <div className="mt-20">
          <p className="text-center text-sm uppercase tracking-wider text-text-muted">E também no seu painel</p>
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {EXTRA_FEATURES.map((f) => (
              <GlassCard key={f.title} hover padding="md" className="space-y-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-neon-gradient-soft text-neon-pink">
                  <f.icon size={16} />
                </div>
                <p className="font-display text-sm">{f.title}</p>
                <p className="text-xs leading-relaxed text-text-secondary">{f.description}</p>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* Por que StudioMaker3D */}
      <section className="mx-auto mt-28 max-w-5xl px-6 md:px-12">
        <h2 className="text-center font-display text-3xl md:text-4xl">
          Por que <span className="neon-text">StudioMaker3D</span>
        </h2>
        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-3">
          {WHY_US.map((w) => (
            <GlassCard key={w.title} padding="lg" className="space-y-3 text-center">
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-neon-gradient-soft text-neon-pink">
                <w.icon size={20} />
              </div>
              <p className="font-display text-base">{w.title}</p>
              <p className="text-sm leading-relaxed text-text-secondary">{w.description}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* Planos */}
      <section className="mx-auto mt-28 max-w-4xl px-6 md:px-12">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl md:text-4xl">Planos simples, sem pegadinha</h2>
          <p className="mt-4 text-text-secondary">
            14 dias de acesso completo pra testar tudo, sem pedir cartão. Depois, continue no Grátis pra sempre ou
            assine pra manter tudo liberado.
          </p>
        </div>
        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
          <GlassCard padding="lg" className="flex flex-col gap-4">
            <h3 className="font-display text-xl">Grátis</h3>
            <p className="font-numeric text-3xl font-semibold">R$ 0</p>
            <p className="text-sm text-text-secondary">Pra sempre, com limites — dá pra testar o essencial.</p>
          </GlassCard>
          {PLANS.map((plan) => {
            const pricing = getCyclePricing(plan.id, "monthly");
            return (
              <GlassCard
                key={plan.id}
                padding="lg"
                className={`flex flex-col gap-4 ${plan.highlighted ? "shadow-neon-glow ring-1 ring-neon-pink/40" : ""}`}
              >
                {plan.highlighted && (
                  <span className="w-fit rounded-pill bg-neon-gradient px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-white">
                    Mais popular
                  </span>
                )}
                <h3 className="font-display text-xl">{plan.name}</h3>
                <p className="font-numeric text-3xl font-semibold">
                  R$ {pricing.price.toFixed(2).replace(".", ",")}
                  <span className="text-sm font-normal text-text-muted"> /mês</span>
                </p>
                <p className="text-sm text-text-secondary">{plan.tagline}</p>
              </GlassCard>
            );
          })}
        </div>
        <div className="mt-8 text-center">
          <Link href="/pricing" className="neon-btn">
            Ver todos os detalhes dos planos <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto mt-28 max-w-2xl px-6 md:px-12">
        <h2 className="text-center font-display text-3xl md:text-4xl">Perguntas frequentes</h2>
        <div className="mt-10 space-y-3">
          {FAQ.map((item) => (
            <GlassAccordion key={item.question} title={item.question}>
              <p className="text-sm text-text-secondary">{item.answer}</p>
            </GlassAccordion>
          ))}
        </div>
      </section>

      {/* CTA final */}
      <section className="mx-auto my-28 max-w-4xl px-6 md:px-12">
        <GlassCard padding="lg" className="flex flex-col items-center gap-4 py-14 text-center shadow-neon-glow">
          <h2 className="font-display text-3xl">Pronto pra saber o lucro real do seu estúdio?</h2>
          <p className="max-w-md text-text-secondary">
            Sem cartão de crédito, 14 dias de acesso completo. Depois, você decide se continua.
          </p>
          <Link href="/signup" className="neon-btn">
            Começar grátis <ArrowRight size={16} />
          </Link>
        </GlassCard>
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
