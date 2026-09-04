/**
 * ✅ Agent-friendly 404 response
 * Next.js 14 automatically returns HTTP 404 for this route
 * Includes markdown guidance so agents can recover
 */

export default function NotFound() {
  return (
    <html lang="pt-BR">
      <body className="bg-bg text-text-primary">
        <div className="min-h-screen flex flex-col items-center justify-center px-4">
          <div className="max-w-2xl">
            <h1 className="text-6xl font-bold mb-4">404</h1>
            <h2 className="text-2xl font-semibold mb-6 text-text-secondary">Página não encontrada</h2>

            <div className="prose prose-invert max-w-none mb-8 text-sm text-text-secondary">
              <p>A página que você está procurando não existe ou foi movida.</p>

              ## Onde ir a seguir

              **Para usuários:**
              - [Home](/) — Início
              - [Pricing](/pricing) — Planos
              - [Documentação](/help) — Ajuda
              - [Contato](/contact) — Entre em contato

              **Para agentes de IA:**
              - [Sitemap](/sitemap.xml) — Índice de todas as páginas
              - [llms.txt](/llms.txt) — Instruções para agentes
              - [Schema.org](https://schema.org) — Dados estruturados

              **Mais informações:**
              - [Sobre](/about) — Sobre nós
              - [Privacidade](/privacy-policy) — Política de privacidade
              - [Termos](/terms) — Termos de serviço
            </div>

            <a
              href="/"
              className="inline-flex h-11 items-center justify-center rounded-pill bg-neon-gradient px-6 font-semibold text-white transition-transform hover:scale-105 active:scale-95"
            >
              Voltar ao início
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
