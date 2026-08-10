"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { NeonButton } from "@/components/ui/NeonButton";

export default function ResetPasswordPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/dashboard`,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSent(true);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl">Recuperar senha</h1>
        <p className="mt-1 text-sm text-text-secondary">Enviaremos um link para redefinir sua senha.</p>
      </div>

      {sent ? (
        <p className="text-sm text-neon-green">Link enviado para {email}. Verifique sua caixa de entrada.</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs text-text-muted">E-mail</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="glass-input w-full" />
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <NeonButton type="submit" className="w-full" disabled={loading}>
            {loading ? "Enviando..." : "Enviar link"}
          </NeonButton>
        </form>
      )}

      <p className="text-center text-sm text-text-secondary">
        <Link href="/login" className="text-neon-pink hover:underline">
          Voltar ao login
        </Link>
      </p>
    </div>
  );
}
