import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Exclusão de Dados — StudioMaker",
  description: "Como solicitar a exclusão da sua conta e dados pessoais no StudioMaker.",
};

export default function DataDeletionPage() {
  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between px-6 py-6 md:px-12">
        <Link href="/home" className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-icon.png" alt="" className="h-9 w-9" />
          <span className="font-display text-lg tracking-wide">StudioMaker</span>
        </Link>
        <Link href="/login" className="text-sm text-text-secondary hover:text-text-primary">
          Já tenho conta
        </Link>
      </header>

      <main className="mx-auto max-w-[720px] px-6 pb-24 pt-8 md:pt-12">
        <h1 className="font-display text-3xl md:text-4xl">Exclusão de Dados do Usuário</h1>
        <p className="mt-2 text-xs text-text-muted">Última atualização: 16 de agosto de 2026</p>

        <Section title="Como solicitar a exclusão dos seus dados">
          <P>
            Você tem o direito de solicitar a exclusão da sua conta e de todos os dados pessoais associados a
            ela no StudioMaker3D a qualquer momento.
          </P>

          <Subsection title="Como solicitar">
            <P>
              Envie um e-mail para{" "}
              <a href="mailto:viviennydiniz@gmail.com" className="text-neon-pink hover:underline">
                viviennydiniz@gmail.com
              </a>{" "}
              com o assunto "Solicitação de Exclusão de Dados", informando:
            </P>
            <Ul
              items={[
                "Nome completo associado à sua conta",
                "E-mail cadastrado na Plataforma",
                "Confirmação de que deseja excluir permanentemente sua conta e os dados associados",
              ]}
            />
          </Subsection>

          <Subsection title="O que acontece após a solicitação">
            <Ul
              items={[
                "Confirmaremos o recebimento da sua solicitação em até 5 dias úteis",
                "Seus dados pessoais, incluindo informações de conta, pedidos, produtos e integrações conectadas, serão excluídos permanentemente em até 15 dias úteis após a confirmação",
                "Dados que somos obrigados a manter por exigência legal, fiscal ou regulatória (quando aplicável) serão retidos apenas pelo período exigido por lei, e excluídos ou anonimizados posteriormente",
                "Você receberá uma confirmação por e-mail quando a exclusão for concluída",
              ]}
            />
          </Subsection>

          <Subsection title="Sobre login via Google ou Facebook">
            <P>
              Se você criou sua conta ou fez login usando Google ou Facebook, a exclusão da sua conta no
              StudioMaker3D não remove automaticamente seus dados dessas plataformas. Para revogar o acesso do
              StudioMaker3D à sua conta Google ou Facebook, acesse as configurações de segurança/aplicativos
              conectados diretamente no Google ou no Facebook.
            </P>
          </Subsection>

          <Subsection title="Dúvidas">
            <P>
              Em caso de dúvidas sobre este processo, entre em contato pelo e-mail informado acima, ou consulte
              nossa{" "}
              <Link href="/privacy-policy" className="text-neon-pink hover:underline">
                Política de Privacidade
              </Link>
              .
            </P>
          </Subsection>
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

function Ul({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="mb-4 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-text-secondary">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}
