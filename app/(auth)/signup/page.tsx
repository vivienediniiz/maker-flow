"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { NeonButton } from "@/components/ui/NeonButton";

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }

    // Se a confirmação de e-mail estiver desativada no Supabase, signUp() já
    // devolve uma sessão ativa — nesse caso pulamos direto pro dashboard em
    // vez de mostrar a tela de "confirme seu e-mail", que nunca chegaria a lugar nenhum.
    if (data.session) {
      router.push("/dashboard");
      router.refresh();
      return;
    }

    setDone(true);
  }

  if (done) {
    return (
      <div className="space-y-3">
        <h1 className="font-display text-2xl">Confirme seu e-mail</h1>
        <p className="text-sm text-text-secondary">
          Enviamos um link de confirmação para <strong>{email}</strong>. Clique nele para ativar sua conta.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl">Crie sua conta</h1>
        <p className="mt-1 text-sm text-text-secondary">Comece grátis, sem cartão de crédito.</p>
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
          <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="glass-input w-full" />
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <NeonButton type="submit" className="w-full" disabled={loading}>
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