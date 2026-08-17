import { Topbar } from "@/components/dashboard/Topbar";
import { GlassAccordion } from "@/components/ui/GlassAccordion";

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
      "Vá em Assinatura, no menu lateral. Lá dá pra assinar Mensal ou Trimestral, por cartão (cobrança automática) ou Pix (renovação manual a cada ciclo).",
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
      "Assinantes dos planos Mensal e Trimestral têm suporte direto via WhatsApp (veja em Suporte). Se você está no plano Grátis, mande um e-mail pra viviennydiniz@gmail.com que respondemos por lá.",
  },
];

export default function HelpPage() {
  return (
    <>
      <Topbar title="Central de Ajuda" />
      <main className="space-y-6 px-6 py-8 md:px-8">
        <p className="max-w-2xl text-sm text-text-secondary">
          Perguntas frequentes sobre o StudioMaker. Não achou o que precisava? Assinantes têm acesso a suporte
          direto via WhatsApp.
        </p>
        <div className="space-y-3">
          {FAQ.map((item) => (
            <GlassAccordion key={item.question} title={item.question}>
              <p className="text-sm text-text-secondary">{item.answer}</p>
            </GlassAccordion>
          ))}
        </div>
      </main>
    </>
  );
}
