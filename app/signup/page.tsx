"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AppLogo } from "@/components/ui/AppLogo";
import { NeonButton } from "@/components/ui/NeonButton";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { SocialAuthButtons } from "@/components/auth/SocialAuthButtons";
import { Starfield } from "@/components/auth/Starfield";
import { LEGAL_VERSION } from "@/lib/legal";
import { useAnalytics } from "@/lib/hooks/useAnalytics";

export default function SignupPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-bg">
      {/* Mesmo fundo da tela de login: degradê diagonal roxo escuro → magenta → laranja */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "linear-gradient(135deg, #280248 0%, #8F1E97 55%, #8F1E97 78%, #E86333 100%)" }}
      />
      <Starfield />

      <AppLogo
        wrapperClassName="absolute left-6 top-6 z-20 flex items-center gap-3 sm:left-10 sm:top-8"
        iconClassName="h-14 w-14"
        textClassName="font-display text-2xl tracking-wide text-text-primary"
      />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-24">
        <Suspense fallback={null}>
          <SignupForm />
        </Suspense>
      </div>
    </div>
  );
}

function SignupForm() {
  const router = useRouter();
  const supabase = createClient();
  const searchParams = useSearchParams();
  const refCode = searchParams.get("ref") ?? undefined;
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const { trackSignup } = useAnalytics();

  // Mensagem única pros dois caminhos de cadastro. Aponta pra baixo porque o
  // botão do Google fica acima do checkbox no card.
  const termsBlock = acceptedTerms
    ? null
    : "Marque o aceite dos Termos de Uso e da Política de Privacidade, logo abaixo, pra continuar.";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // O `required` do input já barra no navegador; isto é a rede de baixo, pro
    // caso de o form ser submetido por outro caminho.
    if (termsBlock) {
      setError(termsBlock);
      return;
    }

    setLoading(true);
    setError(null);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      // `terms_version` vira terms_accepted_at + terms_version no perfil, pela
      // trigger handle_new_user. É o registro que serve de prova do aceite.
      options: { data: { full_name: fullName, ref_code: refCode ?? null, terms_version: LEGAL_VERSION } },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }

    if (data.session) {
      // Rastreia novo signup no GA4
      trackSignup({ tier: "monthly", referrer: refCode });
      router.push("/dashboard");
      return;
    }

    setDone(true);
  }

  if (done) {
    return (
      <div className="glass-card animate-panel-in w-full max-w-sm space-y-3 bg-bg/80 p-8 opacity-0 shadow-neon-glow">
        <h1 className="font-display text-2xl">Confirme seu e-mail</h1>
        <p className="text-sm text-text-secondary">
          Enviamos um link de confirmação para <strong>{email}</strong>. Clique nele para ativar sua conta.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card animate-panel-in w-full max-w-sm space-y-6 bg-bg/80 p-8 opacity-0 shadow-neon-glow">
      <div>
        <h1 className="font-display text-2xl">Crie sua conta</h1>
        <p className="mt-1 text-sm text-text-secondary">Comece grátis, sem cartão de crédito.</p>
      </div>

      <SocialAuthButtons refCode={refCode} termsVersion={LEGAL_VERSION} blockedReason={termsBlock} />

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border-glass" />
        <span className="text-xs text-text-muted">ou com e-mail</span>
        <div className="h-px flex-1 bg-border-glass" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs text-text-muted">Nome completo</label>
          <input required value={fullName} onChange={(e) => setFullName(e.target.value)} className="glass-input w-full" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs text-text-muted">E-mail</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="glass-input w-full" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs text-text-muted">Senha</label>
          <PasswordInput required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>

        <label className="flex cursor-pointer items-start gap-2.5 text-xs leading-relaxed text-text-secondary">
          <input
            type="checkbox"
            required
            checked={acceptedTerms}
            onChange={(e) => setAcceptedTerms(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-neon-pink"
          />
          <span>
            Li e aceito os{" "}
            <Link href="/terms" target="_blank" className="text-neon-pink hover:underline">
              Termos de Uso
            </Link>{" "}
            e a{" "}
            <Link href="/privacy-policy" target="_blank" className="text-neon-pink hover:underline">
              Política de Privacidade
            </Link>
            .
          </span>
        </label>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <NeonButton type="submit" className="w-full" disabled={loading || !acceptedTerms}>
          {loading ? "Criando..." : "Criar conta"}
        </NeonButton>
      </form>

      <p className="text-center text-sm text-text-secondary">
        Já tem conta?{" "}
        <Link href="/login" className="text-neon-pink hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  );
}
