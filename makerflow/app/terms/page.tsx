import type { Metadata } from "next";
import Link from "next/link";
import { AppLogo } from "@/components/ui/AppLogo";
import { TERMS_UPDATED_AT } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Termos de Uso — StudioMaker",
  description: "Termos de uso da plataforma StudioMaker3D.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between px-6 py-6 md:px-12">
        <AppLogo />
        <Link href="/login" className="text-sm text-text-secondary hover:text-text-primary">
          Já tenho conta
        </Link>
      </header>

      <main className="mx-auto max-w-[720px] px-6 pb-24 pt-8 md:pt-12">
        <h1 className="font-display text-3xl md:text-4xl">Termos de Uso</h1>
        <p className="mt-2 text-xs text-text-muted">Última atualização: {TERMS_UPDATED_AT}</p>

        <Section title="1. Aceite dos termos">
          <P>
            Estes Termos de Uso regulam o acesso e uso da plataforma <Strong>StudioMaker3D</Strong>, sistema de
            gestão para estúdios de impressão 3D e produtos personalizados. Ao criar uma conta ou utilizar a
            Plataforma, você concorda integralmente com estes termos.
          </P>
          <P>
            <Strong>Fornecedor do serviço:</Strong>
            <br />
            Viviene Da cunha diniz de Araújo — CNPJ 64.411.407/0001-94
            <br />
            E-mail de contato: viviennydiniz@gmail.com
          </P>
        </Section>

        <Divider />

        <Section title="2. Descrição do serviço">
          <P>
            O StudioMaker3D é um software de gestão que ajuda estúdios de impressão 3D a calcular custos e preços
            de produção, controlar estoque de filamentos e insumos, gerenciar vendas em múltiplos canais, cotar e
            rastrear frete, acompanhar impressoras e organizar o financeiro do negócio.
          </P>
        </Section>

        <Divider />

        <Section title="3. Cadastro e conta">
          <Ul
            items={[
              "Você é responsável por manter suas credenciais de acesso em sigilo e por toda atividade realizada na sua conta.",
              "As informações fornecidas no cadastro devem ser verdadeiras e mantidas atualizadas.",
              "Contas podem ser criadas por e-mail e senha ou por login social (Google).",
            ]}
          />
        </Section>

        <Divider />

        <Section title="4. Planos, teste gratuito e pagamento">
          <Ul
            items={[
              "Toda conta nova recebe 14 dias de acesso completo aos recursos pagos, sem necessidade de cadastrar cartão.",
              "Após o período de teste, a conta permanece ativa no plano Grátis (com limites) até que uma assinatura paga seja contratada.",
              "Os planos pagos (Starter e Pro, ciclo mensal ou anual) são cobrados de forma recorrente, por cartão de crédito (cobrança automática) ou Pix (renovação manual a cada ciclo), conforme detalhado na página de Planos.",
              "Você pode cancelar sua assinatura a qualquer momento, sem multa ou fidelidade — o acesso pago continua até o fim do período já pago, voltando automaticamente ao plano Grátis em seguida.",
              "Valores e condições dos planos podem ser reajustados mediante aviso prévio, sem afetar cobranças já realizadas.",
            ]}
          />
        </Section>

        <Divider />

        <Section title="5. Uso permitido">
          <P>Ao usar a Plataforma, você concorda em não:</P>
          <Ul
            items={[
              "Utilizar o serviço para fins ilícitos ou que violem direitos de terceiros",
              "Tentar acessar dados de outros usuários ou burlar mecanismos de segurança",
              "Fazer engenharia reversa, copiar ou revender a Plataforma sem autorização",
              "Sobrecarregar ou comprometer a infraestrutura do serviço de forma proposital",
            ]}
          />
        </Section>

        <Divider />

        <Section title="6. Seus dados e conteúdo">
          <P>
            Os dados que você cadastra na Plataforma (produtos, clientes, vendas, informações financeiras) são de
            sua propriedade. Utilizamos esses dados exclusivamente para fornecer o serviço, conforme descrito na
            nossa{" "}
            <Link href="/privacy-policy" className="text-neon-pink hover:underline">
              Política de Privacidade
            </Link>
            . Você pode solicitar a exclusão da sua conta e dados a qualquer momento, conforme nossa página de{" "}
            <Link href="/data-deletion" className="text-neon-pink hover:underline">
              Exclusão de Dados
            </Link>
            .
          </P>
        </Section>

        <Divider />

        <Section title="7. Integrações com terceiros">
          <P>
            A Plataforma permite conectar contas de plataformas de venda (Mercado Pago, Mercado Livre, Shopee,
            TikTok Shop) e de logística (Melhor Envio). Essas integrações dependem da disponibilidade e das regras
            de cada plataforma externa — não nos responsabilizamos por instabilidades, mudanças de API ou
            indisponibilidade causadas por esses terceiros.
          </P>
        </Section>

        <Divider />

        <Section title="8. Limitação de responsabilidade">
          <P>
            O StudioMaker3D é uma ferramenta de apoio à gestão do seu negócio. Os cálculos de custo, preço e frete
            são baseados nos dados que você informa — a precisão do resultado depende da precisão da informação
            cadastrada. Não nos responsabilizamos por decisões comerciais tomadas com base nesses cálculos, nem por
            perdas decorrentes de indisponibilidade temporária do serviço.
          </P>
        </Section>

        <Divider />

        <Section title="9. Alterações nestes termos">
          <P>
            Podemos atualizar estes Termos de Uso periodicamente. Alterações significativas serão comunicadas por
            e-mail ou aviso na Plataforma. A data da última atualização está indicada no topo deste documento.
          </P>
        </Section>

        <Divider />

        <Section title="10. Contato">
          <P>
            Para dúvidas sobre estes Termos de Uso, entre em contato:{" "}
            <a href="mailto:viviennydiniz@gmail.com" className="text-neon-pink hover:underline">
              viviennydiniz@gmail.com
            </a>
          </P>
        </Section>
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display mt-10 mb-3 text-xl">{title}</h2>
      {children}
    </section>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="mb-4 text-sm leading-relaxed text-text-secondary">{children}</p>;
}

function Strong({ children }: { children: React.ReactNode }) {
  return <strong className="font-semibold text-text-primary">{children}</strong>;
}

function Ul({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="mb-4 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-text-secondary">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

function Divider() {
  return <hr className="my-10 border-border-glass" />;
}
