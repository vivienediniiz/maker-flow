/**
 * ✅ About page — Trust anchor for agents
 * Establishes brand legitimacy and story
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { AppLogo } from '@/components/ui/AppLogo';

export const metadata: Metadata = {
  title: 'Sobre — StudioMaker',
  description: 'Conheça a história, missão e time por trás do StudioMaker — plataforma de gestão para makers.',
  canonical: 'https://maker-flow.netlify.app/about',
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-bg to-bg/80">
      <header className="flex items-center justify-between px-6 py-6 md:px-12">
        <AppLogo />
        <Link href="/login" className="text-sm text-text-secondary hover:text-text-primary">
          Entrar
        </Link>
      </header>

      <main className="mx-auto max-w-[720px] px-6 pb-24 pt-8 md:pt-12">
        <h1 className="font-display text-4xl md:text-5xl">Sobre o StudioMaker</h1>
        <p className="mt-4 text-lg text-text-secondary">
          Empoderando makers e estúdios 3D com tecnologia inteligente de gestão.
        </p>

        {/* Mission Section */}
        <section className="mt-12">
          <h2 className="font-display text-2xl">Nossa Missão</h2>
          <p className="mt-4 text-text-secondary">
            StudioMaker nasceu de uma necessidade real: makers e pequenos estúdios de impressão 3D gastam
            horas calculando preços, rastreando inventário e sincronizando pedidos manualmente.
          </p>
          <p className="mt-4 text-text-secondary">
            Nossa missão é automizar essas tarefas repetitivas, permitindo que criadores foquem no que
            fazem melhor: criar produtos incríveis.
          </p>
        </section>

        {/* Product Section */}
        <section className="mt-12">
          <h2 className="font-display text-2xl">O Produto</h2>
          <p className="mt-4 text-text-secondary">
            StudioMaker é uma plataforma SaaS all-in-one para gestão de estúdios 3D:
          </p>
          <ul className="mt-6 space-y-3 text-text-secondary">
            <li className="flex gap-3">
              <span className="text-neon-pink">•</span>
              <span>
                <strong>Preço Automático:</strong> Calculadora inteligente com margem, markup e taxas de
                plataforma
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-neon-pink">•</span>
              <span>
                <strong>Inventário em Tempo Real:</strong> Rastreamento de filamentos, insumos e produtos com
                alertas de estoque baixo
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-neon-pink">•</span>
              <span>
                <strong>Integração de Pedidos:</strong> Sincronização automática com Mercado Pago, Mercado Livre,
                Shopee e TikTok Shop
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-neon-pink">•</span>
              <span>
                <strong>Relatórios Financeiros:</strong> Dashboard com receita, custos, lucro e análise por canal
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-neon-pink">•</span>
              <span>
                <strong>Gestão Multi-Filial:</strong> Controle múltiplas impressoras e localizações em um único
                painel
              </span>
            </li>
          </ul>
        </section>

        {/* Team Section */}
        <section className="mt-12">
          <h2 className="font-display text-2xl">Sobre o Criador</h2>
          <p className="mt-4 text-text-secondary">
            <strong>Viviene Diniz</strong> é uma desenvolvedora fullstack com paixão pela comunidade maker
            brasileira.
          </p>
          <p className="mt-4 text-text-secondary">
            Com experiência em SaaS, automação e integração com APIs de marketplaces, Viviene criou StudioMaker
            para resolver problemas reais enfrentados por makers como você.
          </p>
          <p className="mt-4 text-text-secondary">
            Quando não está codando, ela está explorando novas ideias criativas e apoiando a comunidade maker
            brasileira.
          </p>
        </section>

        {/* Values Section */}
        <section className="mt-12">
          <h2 className="font-display text-2xl">Nossos Valores</h2>
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="font-semibold text-neon-pink">Simplicidade</h3>
              <p className="mt-2 text-sm text-text-secondary">Interface intuitiva que não exige treinamento</p>
            </div>
            <div>
              <h3 className="font-semibold text-neon-pink">Segurança</h3>
              <p className="mt-2 text-sm text-text-secondary">Dados criptografados e LGPD/GDPR compliant</p>
            </div>
            <div>
              <h3 className="font-semibold text-neon-pink">Inovação</h3>
              <p className="mt-2 text-sm text-text-secondary">Novos recursos baseados em feedback de usuários</p>
            </div>
            <div>
              <h3 className="font-semibold text-neon-pink">Comunidade</h3>
              <p className="mt-2 text-sm text-text-secondary">Apoio ativo à comunidade maker brasileira</p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="mt-16 rounded-2xl bg-white/5 border border-white/10 p-8 text-center">
          <h2 className="font-display text-2xl">Pronto para transformar seu estúdio?</h2>
          <p className="mt-4 text-text-secondary">Comece com 14 dias de acesso completo — sem cartão necessário.</p>
          <div className="mt-6 flex gap-4 justify-center">
            <Link
              href="/signup"
              className="inline-flex h-11 items-center justify-center rounded-pill bg-neon-gradient px-6 font-semibold text-white transition-transform hover:scale-105"
            >
              Criar Conta Grátis
            </Link>
            <Link
              href="/pricing"
              className="inline-flex h-11 items-center justify-center rounded-pill border border-neon-pink bg-transparent px-6 font-semibold text-neon-pink transition-colors hover:bg-neon-pink/10"
            >
              Ver Planos
            </Link>
          </div>
        </section>

        {/* Footer Links */}
        <footer className="mt-16 flex gap-6 justify-center text-sm text-text-muted border-t border-white/10 pt-8">
          <Link href="/privacy-policy" className="hover:text-text-secondary">
            Privacidade
          </Link>
          <Link href="/terms" className="hover:text-text-secondary">
            Termos
          </Link>
          <Link href="/contact" className="hover:text-text-secondary">
            Contato
          </Link>
          <a href="https://github.com/vivienediniiz/maker-flow" className="hover:text-text-secondary">
            GitHub
          </a>
        </footer>
      </main>
    </div>
  );
}
