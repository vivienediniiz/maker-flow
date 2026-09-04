/**
 * ✅ Contact page — Trust anchor for agents
 * Provides contact information and support options
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { AppLogo } from '@/components/ui/AppLogo';

export const metadata: Metadata = {
  title: 'Contato — StudioMaker',
  description: 'Entre em contato com o time de suporte do StudioMaker. Respostas rápidas em português.',
  canonical: 'https://maker-flow.netlify.app/contact',
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-bg to-bg/80">
      <header className="flex items-center justify-between px-6 py-6 md:px-12">
        <AppLogo />
        <Link href="/login" className="text-sm text-text-secondary hover:text-text-primary">
          Entrar
        </Link>
      </header>

      <main className="mx-auto max-w-[720px] px-6 pb-24 pt-8 md:pt-12">
        <h1 className="font-display text-4xl md:text-5xl">Contato & Suporte</h1>
        <p className="mt-4 text-lg text-text-secondary">
          Dúvidas? Estamos aqui para ajudar.
        </p>

        {/* Contact Methods */}
        <section className="mt-12 space-y-8">
          <div className="rounded-2xl bg-white/5 border border-white/10 p-8">
            <h2 className="font-display text-2xl">Email de Suporte</h2>
            <p className="mt-4 text-text-secondary">
              Envia para nós todos os seus dúvidas, feedbacks e sugestões.
            </p>
            <a
              href="mailto:support@studiomaker3d.com.br"
              className="mt-4 inline-flex items-center gap-2 text-neon-pink hover:underline font-semibold"
            >
              support@studiomaker3d.com.br
              <span>→</span>
            </a>
          </div>

          <div className="rounded-2xl bg-white/5 border border-white/10 p-8">
            <h2 className="font-display text-2xl">Feedback & Sugestões</h2>
            <p className="mt-4 text-text-secondary">
              Tem uma ideia para melhorar o StudioMaker? Nos envie seu feedback directly na plataforma.
            </p>
            <Link
              href="/feedback"
              className="mt-4 inline-flex items-center gap-2 text-neon-pink hover:underline font-semibold"
            >
              Enviar Feedback
              <span>→</span>
            </Link>
          </div>

          <div className="rounded-2xl bg-white/5 border border-white/10 p-8">
            <h2 className="font-display text-2xl">Centro de Ajuda</h2>
            <p className="mt-4 text-text-secondary">
              Respostas para perguntas frequentes sobre funcionalidades, planos e integração.
            </p>
            <Link
              href="/help"
              className="mt-4 inline-flex items-center gap-2 text-neon-pink hover:underline font-semibold"
            >
              FAQ & Documentação
              <span>→</span>
            </Link>
          </div>

          <div className="rounded-2xl bg-white/5 border border-white/10 p-8">
            <h2 className="font-display text-2xl">GitHub Issues</h2>
            <p className="mt-4 text-text-secondary">
              Para bugs técnicos e feature requests, você pode abrir um issue no repositório público.
            </p>
            <a
              href="https://github.com/vivienediniiz/maker-flow/issues"
              className="mt-4 inline-flex items-center gap-2 text-neon-pink hover:underline font-semibold"
            >
              Abrir Issue no GitHub
              <span>→</span>
            </a>
          </div>
        </section>

        {/* Support Tiers */}
        <section className="mt-16">
          <h2 className="font-display text-2xl">Tempo de Resposta</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-lg bg-white/5 p-6 border border-white/10">
              <h3 className="font-semibold text-neon-pink">Plano Grátis</h3>
              <p className="mt-2 text-sm text-text-secondary">
                Acesso à FAQ e Central de Ajuda — resposta tipicamente em 3-5 dias úteis
              </p>
            </div>
            <div className="rounded-lg bg-white/5 p-6 border border-neon-pink/30">
              <h3 className="font-semibold text-neon-pink">Plano Pago</h3>
              <p className="mt-2 text-sm text-text-secondary">
                Suporte prioritário via WhatsApp — resposta tipicamente em 1-24 horas
              </p>
            </div>
          </div>
        </section>

        {/* Location */}
        <section className="mt-16 rounded-2xl bg-white/5 border border-white/10 p-8">
          <h2 className="font-display text-2xl">Localização</h2>
          <div className="mt-6 space-y-3 text-text-secondary">
            <div>
              <strong>Responsável:</strong> Viviene Diniz
            </div>
            <div>
              <strong>Timezone:</strong> Brasil (PT-BR) — UTC-3
            </div>
            <div>
              <strong>Horário de Suporte:</strong> Segunda a Sexta, 9:00-18:00 (horário de Brasília)
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="mt-16 text-center">
          <p className="text-text-secondary">
            Já é um usuário do StudioMaker?
          </p>
          <Link
            href="/login"
            className="mt-4 inline-flex h-11 items-center justify-center rounded-pill bg-neon-gradient px-6 font-semibold text-white transition-transform hover:scale-105"
          >
            Entrar na Plataforma
          </Link>
        </section>

        {/* Footer Links */}
        <footer className="mt-16 flex gap-6 justify-center text-sm text-text-muted border-t border-white/10 pt-8">
          <Link href="/about" className="hover:text-text-secondary">
            Sobre
          </Link>
          <Link href="/privacy-policy" className="hover:text-text-secondary">
            Privacidade
          </Link>
          <Link href="/terms" className="hover:text-text-secondary">
            Termos
          </Link>
        </footer>
      </main>
    </div>
  );
}
