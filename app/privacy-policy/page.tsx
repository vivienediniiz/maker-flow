import type { Metadata } from "next";
import Link from "next/link";
import { Zap } from "lucide-react";

export const metadata: Metadata = {
  title: "Política de Privacidade — StudioMaker",
  description: "Como o StudioMaker coleta, usa e protege os dados dos seus usuários.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between px-6 py-6 md:px-12">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-neon-gradient shadow-neon-glow">
            <Zap size={18} className="text-white" />
          </div>
          <span className="font-display text-lg tracking-wide">StudioMaker</span>
        </Link>
        <Link href="/login" className="text-sm text-text-secondary hover:text-text-primary">
          Já tenho conta
        </Link>
      </header>

      <main className="mx-auto max-w-[720px] px-6 pb-24 pt-8 md:pt-12">
        <h1 className="font-display text-3xl md:text-4xl">Política de Privacidade</h1>
        <p className="mt-2 text-xs text-text-muted">Última atualização: 16 de agosto de 2026</p>

        <Section title="1. Introdução">
          <P>
            Esta Política de Privacidade descreve como o <Strong>StudioMaker3D</Strong> ("nós", "nosso" ou
            "Plataforma"), sistema de gestão para estúdios de impressão 3D e produtos personalizados, coleta,
            usa, armazena e protege as informações dos usuários que utilizam nossos serviços.
          </P>
          <P>Ao criar uma conta ou utilizar a Plataforma, você concorda com as práticas descritas nesta política.</P>
          <P>
            <Strong>Responsável pelo tratamento dos dados (Controlador):</Strong>
            <br />
            Viviene Da cunha diniz de Araújo
            <br />
            CNPJ: 64.411.407/0001-94
            <br />
            E-mail de contato: viviennydiniz@gmail.com
          </P>
        </Section>

        <Divider />

        <Section title="2. Quais dados coletamos">
          <Subsection title="2.1 Dados fornecidos diretamente por você">
            <Ul
              items={[
                "Nome completo, e-mail e senha (ou login via Google/Facebook, quando você opta por essa forma de acesso)",
                "Dados do seu negócio: nome do estúdio, telefone, endereço, CNPJ/CPF (quando informado)",
                "Dados de produtos, clientes, pedidos, orçamentos e informações financeiras que você cadastra na Plataforma",
              ]}
            />
          </Subsection>

          <Subsection title="2.2 Dados de login social (Google e Facebook)">
            <P>
              Quando você opta por entrar com Google ou Facebook, recebemos do provedor apenas: nome, e-mail e
              foto de perfil (quando disponível), usados exclusivamente para criar e autenticar sua conta. Não
              acessamos publicações, lista de amigos/contatos, ou qualquer outro dado da sua conta Google/Facebook
              além do necessário para o login.
            </P>
          </Subsection>

          <Subsection title="2.3 Dados de integrações com plataformas de venda">
            <P>
              Caso você conecte sua conta do Mercado Pago, Mercado Livre, Shopee ou TikTok Shop, coletamos dados
              de pedidos realizados nessas plataformas: identificador do pedido, itens comprados, valores,
              status, e dados mínimos do comprador necessários para processamento do pedido (ex: nome, endereço
              de entrega). Esses dados são coletados apenas com sua autorização explícita (OAuth) e usados
              exclusivamente para exibição no painel de gestão da sua conta.
            </P>
          </Subsection>

          <Subsection title="2.4 Dados de impressoras 3D">
            <P>
              Quando você conecta uma impressora à Plataforma, coletamos dados técnicos de telemetria (status de
              impressão, progresso, temperatura, e opcionalmente imagens de câmera) transmitidos pelo software de
              conexão local ("bridge") instalado no seu computador. Esses dados são vinculados exclusivamente à
              sua conta.
            </P>
          </Subsection>

          <Subsection title="2.5 Dados de uso e técnicos">
            <P>
              Endereço IP, tipo de navegador, páginas acessadas e informações de sessão, coletados
              automaticamente para fins de segurança e melhoria do serviço.
            </P>
          </Subsection>
        </Section>

        <Divider />

        <Section title="3. Como usamos seus dados">
          <P>Utilizamos os dados coletados para:</P>
          <Ul
            items={[
              "Criar e gerenciar sua conta na Plataforma",
              "Fornecer as funcionalidades de gestão de pedidos, estoque, orçamentos e produção",
              "Processar a sincronização de dados com plataformas de venda que você conectar",
              "Exibir telemetria de suas impressoras conectadas",
              "Processar pagamentos de assinatura da Plataforma",
              "Enviar comunicações relacionadas ao serviço (avisos técnicos, atualizações, suporte)",
              "Cumprir obrigações legais e regulatórias",
              "Melhorar a segurança e o desempenho da Plataforma",
            ]}
          />
          <P>Não utilizamos seus dados para fins de publicidade de terceiros, e não vendemos seus dados pessoais.</P>
        </Section>

        <Divider />

        <Section title="4. Com quem compartilhamos seus dados">
          <Ul
            items={[
              <>
                <Strong>Provedores de infraestrutura:</Strong> utilizamos o Supabase (banco de dados e
                autenticação) e a Netlify (hospedagem) para operar a Plataforma. Esses provedores têm acesso
                técnico aos dados armazenados, sob obrigações contratuais de confidencialidade e segurança.
              </>,
              <>
                <Strong>Processadores de pagamento:</Strong> o Mercado Pago processa os pagamentos de assinatura
                da Plataforma.
              </>,
              <>
                <Strong>Plataformas de venda integradas:</Strong> quando você conecta Mercado Pago, Mercado
                Livre, Shopee ou TikTok Shop, há troca de dados diretamente com essas plataformas, conforme
                autorizado por você no momento da conexão.
              </>,
              <>
                <Strong>Autoridades legais:</Strong> quando exigido por lei, ordem judicial ou para proteger
                direitos legais da Plataforma ou de terceiros.
              </>,
            ]}
          />
          <P>Não compartilhamos seus dados com terceiros para fins de marketing sem seu consentimento explícito.</P>
        </Section>

        <Divider />

        <Section title="5. Segurança dos dados">
          <P>Adotamos medidas técnicas e organizacionais para proteger seus dados, incluindo:</P>
          <Ul
            items={[
              "Criptografia de credenciais sensíveis (tokens de acesso a integrações) em repouso",
              "Controle de acesso por usuário via Row Level Security no banco de dados (cada usuário só acessa seus próprios dados)",
              "Conexões criptografadas (HTTPS/TLS) em todas as comunicações com a Plataforma",
            ]}
          />
          <P>
            Apesar dos esforços de segurança, nenhum sistema é 100% livre de riscos. Em caso de incidente de
            segurança que afete seus dados, notificaremos você conforme exigido pela legislação aplicável.
          </P>
        </Section>

        <Divider />

        <Section title="6. Seus direitos (LGPD)">
          <P>Conforme a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), você tem direito a:</P>
          <Ul
            items={[
              "Confirmar a existência de tratamento dos seus dados",
              "Acessar os dados que temos sobre você",
              "Corrigir dados incompletos, inexatos ou desatualizados",
              "Solicitar a anonimização, bloqueio ou eliminação de dados desnecessários",
              "Solicitar a portabilidade dos seus dados",
              "Revogar o consentimento a qualquer momento",
              "Solicitar a exclusão de dados tratados com base no seu consentimento",
            ]}
          />
          <P>
            Para exercer esses direitos, entre em contato pelo e-mail:{" "}
            <a href="mailto:viviennydiniz@gmail.com" className="text-neon-pink hover:underline">
              viviennydiniz@gmail.com
            </a>
          </P>
        </Section>

        <Divider />

        <Section title="7. Retenção de dados">
          <P>
            Mantemos seus dados enquanto sua conta estiver ativa na Plataforma. Após o encerramento da conta, os
            dados podem ser mantidos por período adicional quando exigido por obrigações legais, fiscais ou
            contratuais, sendo excluídos ou anonimizados posteriormente.
          </P>
        </Section>

        <Divider />

        <Section title="8. Cookies">
          <P>
            Utilizamos cookies essenciais para autenticação e funcionamento da Plataforma. Não utilizamos
            cookies de rastreamento publicitário de terceiros.
          </P>
        </Section>

        <Divider />

        <Section title="9. Dados de menores de idade">
          <P>
            A Plataforma não é direcionada a menores de 18 anos e não coletamos intencionalmente dados de
            menores. Caso identifiquemos que dados de um menor foram coletados sem o devido consentimento dos
            responsáveis, tomaremos medidas para excluí-los.
          </P>
        </Section>

        <Divider />

        <Section title="10. Alterações nesta política">
          <P>
            Podemos atualizar esta Política de Privacidade periodicamente. Alterações significativas serão
            comunicadas por e-mail ou aviso na Plataforma. A data da última atualização está indicada no topo
            deste documento.
          </P>
        </Section>

        <Divider />

        <Section title="11. Contato">
          <P>
            Para dúvidas, solicitações ou reclamações relacionadas a esta Política de Privacidade ou ao
            tratamento dos seus dados pessoais, entre em contato:
          </P>
          <P>
            E-mail:{" "}
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

function Subsection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-6">
      <h3 className="font-display mb-2 text-base text-text-primary">{title}</h3>
      {children}
    </div>
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
