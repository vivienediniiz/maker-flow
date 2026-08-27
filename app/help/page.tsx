import type { Metadata } from "next";
import Link from "next/link";
import { AppLogo } from "@/components/ui/AppLogo";
import { GlassAccordion } from "@/components/ui/GlassAccordion";

export const metadata: Metadata = {
  title: "Central de Ajuda — StudioMaker",
  description: "Perguntas frequentes sobre o StudioMaker.",
};

const FAQ = [
  {
    question: "Como funciona o período de teste?",
    answer:
      "Toda conta nova recebe 14 dias de acesso completo aos recursos pagos, sem precisar cadastrar cartão. Depois desse período, se você não assinar um plano, a conta continua funcionando normalmente no plano Grátis, só que com alguns limites (veja em Assinatura → comparativo de planos).",
  },
  {
    question: "O que acontece com meus dados se eu ficar no plano Grátis?",
    answer:
      "Nada é apagado. Clientes, produtos, filamentos e vendas que passarem do limite do plano Grátis continuam salvos e visíveis — você só não consegue cadastrar itens novos além do limite até assinar um plano.",
  },
  {
    question: "Como faço pra assinar ou trocar de plano?",
    answer:
      "Vá em Assinatura, no menu lateral. Lá dá pra assinar Starter ou Pro, mensal ou anual, por cartão (cobrança automática) ou Pix (renovação manual a cada ciclo).",
  },
  {
    question: "Posso cancelar quando quiser?",
    answer:
      "Sim, não tem fidelidade. Cancelando a assinatura por cartão, você continua com acesso até o fim do período já pago e depois volta pro plano Grátis automaticamente.",
  },
  {
    question: "Como cadastro minha impressora?",
    answer:
      "Em Cadastros → Impressoras. Hoje o cadastro é de controle patrimonial (modelo, número de série, valor pago, garantia, histórico de manutenção) — não é telemetria em tempo real.",
  },
  {
    question: "Quais plataformas de venda dá pra conectar?",
    answer:
      "Mercado Pago e Mercado Livre já conectam via OAuth em Integrações. Shopee e TikTok Shop estão prontos no sistema, aguardando aprovação do app nas respectivas plataformas.",
  },
  {
    question: "Não achei resposta pra minha dúvida — e agora?",
    answer:
      "Assinantes dos planos Starter e Pro têm suporte direto via WhatsApp (veja em Suporte). Se você está no plano Grátis ou ainda não tem conta, mande um e-mail pra viviennydiniz@gmail.com ou use a página de Sugestões e Reclamações.",
  },
];

export default function HelpPage() {
  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between px-6 py-6 md:px-12">
        <AppLogo />
        <Link href="/login" className="text-sm text-text-secondary hover:text-text-primary">
          Já tenho conta
        </Link>
      </header>

      <main className="mx-auto max-w-2xl px-6 pb-24 pt-8 md:pt-12">
        <h1 className="font-display text-3xl md:text-4xl">Central de Ajuda</h1>
        <p className="mt-3 text-sm leading-relaxed text-text-secondary">
          Perguntas frequentes sobre o StudioMaker. Não achou o que precisava? Mande sua dúvida pela página de{" "}
          <Link href="/feedback" className="text-neon-pink hover:underline">
            Sugestões e Reclamações
          </Link>
          .
        </p>

        <div className="mt-8 space-y-3">
          {FAQ.map((item) => (
            <GlassAccordion key={item.question} title={item.question}>
              <p className="text-sm text-text-secondary">{item.answer}</p>
            </GlassAccordion>
          ))}
        </div>
      </main>

      <footer className="space-y-2 border-t border-border-glass px-6 py-8 text-center text-xs text-text-muted md:px-12">
        <p>© 2026 StudioMaker. Feito para a comunidade Maker.</p>
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
