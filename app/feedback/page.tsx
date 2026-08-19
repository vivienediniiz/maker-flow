"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppLogo } from "@/components/ui/AppLogo";
import { GlassCard } from "@/components/ui/GlassCard";
import { NeonButton } from "@/components/ui/NeonButton";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Star, Lightbulb, MessageSquareWarning, Check } from "lucide-react";
import type { FeedbackCategory } from "@/lib/types";

interface Identity {
  userId: string | null;
  guestName: string;
  guestEmail: string;
}

export default function FeedbackPage() {
  const supabase = createClient();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setUserId(user.id);
        setGuestEmail(user.email ?? "");
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .single();
        if (profile?.full_name) setGuestName(profile.full_name);
      }
      setCheckingAuth(false);
    })();
  }, []);

  const isGuest = !userId;
  const identity: Identity = { userId, guestName, guestEmail };

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between px-6 py-6 md:px-12">
        <AppLogo />
        <Link href="/login" className="text-sm text-text-secondary hover:text-text-primary">
          Já tenho conta
        </Link>
      </header>

      <main className="mx-auto max-w-2xl space-y-6 px-6 pb-24 pt-8 md:pt-12">
        <div>
          <h1 className="font-display text-3xl md:text-4xl">Sugestões e Avaliação</h1>
          <p className="mt-3 text-sm leading-relaxed text-text-secondary">
            Algo que poderia funcionar melhor, ou uma ideia pro StudioMaker? Manda aqui — lemos tudo, mesmo se você
            ainda não tiver conta.
          </p>
        </div>

        {!checkingAuth && isGuest && (
          <GlassCard padding="lg" className="space-y-3">
            <p className="text-sm text-text-secondary">
              Como você ainda não está logado, informe seu nome e e-mail pra conseguirmos retornar contato:
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                className="glass-input w-full"
                placeholder="Seu nome"
              />
              <input
                type="email"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                className="glass-input w-full"
                placeholder="seu@email.com"
              />
            </div>
          </GlassCard>
        )}

        <SuggestionForm identity={identity} isGuest={isGuest} disabled={checkingAuth} />
        <RatingForm identity={identity} isGuest={isGuest} disabled={checkingAuth} />
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

function guestFieldsMissing(identity: Identity, isGuest: boolean) {
  return isGuest && (!identity.guestName.trim() || !identity.guestEmail.trim());
}

function SuggestionForm({
  identity,
  isGuest,
  disabled,
}: {
  identity: Identity;
  isGuest: boolean;
  disabled: boolean;
}) {
  const supabase = createClient();
  const [category, setCategory] = useState<Extract<FeedbackCategory, "suggestion" | "complaint">>("suggestion");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!message.trim()) {
      setError("Escreva sua sugestão ou reclamação antes de enviar.");
      return;
    }
    if (guestFieldsMissing(identity, isGuest)) {
      setError("Informe seu nome e e-mail pra enviar.");
      return;
    }

    setSaving(true);
    const { error: insertError } = await supabase.from("feedback_submissions").insert(
      identity.userId
        ? { user_id: identity.userId, category, message: message.trim() }
        : {
            user_id: null,
            guest_name: identity.guestName.trim(),
            guest_email: identity.guestEmail.trim(),
            category,
            message: message.trim(),
          }
    );

    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }

    setMessage("");
    setDone(true);
    setTimeout(() => setDone(false), 4000);
  }

  return (
    <GlassCard padding="lg" className="space-y-4">
      <div>
        <h3 className="font-display text-lg">Sugestões e Reclamações</h3>
        <p className="text-sm text-text-secondary">
          Algo que poderia funcionar melhor, ou uma ideia pro StudioMaker? Manda aqui — lemos tudo.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="glass-card flex gap-1 p-1">
          <button
            type="button"
            onClick={() => setCategory("suggestion")}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-pill py-2 text-xs font-medium transition-colors",
              category === "suggestion" ? "bg-neon-gradient text-white" : "text-text-secondary hover:text-text-primary"
            )}
          >
            <Lightbulb size={13} /> Sugestão
          </button>
          <button
            type="button"
            onClick={() => setCategory("complaint")}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-pill py-2 text-xs font-medium transition-colors",
              category === "complaint" ? "bg-neon-gradient text-white" : "text-text-secondary hover:text-text-primary"
            )}
          >
            <MessageSquareWarning size={13} /> Reclamação
          </button>
        </div>

        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          className="glass-input w-full resize-none"
          placeholder={
            category === "suggestion"
              ? "Ex: seria ótimo ter um jeito de duplicar um produto já cadastrado..."
              : "Ex: tive um problema ao gerar o PDF de orçamento..."
          }
        />

        {error && <p className="text-xs text-red-400">{error}</p>}
        {done && (
          <p className="flex items-center gap-1.5 text-xs text-neon-green">
            <Check size={13} /> Enviado, obrigado!
          </p>
        )}

        <NeonButton type="submit" disabled={saving || disabled} className="w-full justify-center">
          {saving ? "Enviando..." : "Enviar"}
        </NeonButton>
      </form>
    </GlassCard>
  );
}

function RatingForm({
  identity,
  isGuest,
  disabled,
}: {
  identity: Identity;
  isGuest: boolean;
  disabled: boolean;
}) {
  const supabase = createClient();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (rating === 0) {
      setError("Escolha uma nota de 1 a 5 estrelas.");
      return;
    }
    if (guestFieldsMissing(identity, isGuest)) {
      setError("Informe seu nome e e-mail pra enviar.");
      return;
    }

    setSaving(true);
    const { error: insertError } = await supabase.from("feedback_submissions").insert(
      identity.userId
        ? { user_id: identity.userId, category: "rating", rating, message: comment.trim() || null }
        : {
            user_id: null,
            guest_name: identity.guestName.trim(),
            guest_email: identity.guestEmail.trim(),
            category: "rating",
            rating,
            message: comment.trim() || null,
          }
    );

    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }

    setRating(0);
    setComment("");
    setDone(true);
    setTimeout(() => setDone(false), 4000);
  }

  return (
    <GlassCard padding="lg" className="space-y-4">
      <div>
        <h3 className="font-display text-lg">Avalie o StudioMaker</h3>
        <p className="text-sm text-text-secondary">O que você acha do sistema até aqui?</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center justify-center gap-2 py-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              onMouseEnter={() => setHoverRating(n)}
              onMouseLeave={() => setHoverRating(0)}
              aria-label={`${n} estrela${n > 1 ? "s" : ""}`}
              className="text-text-muted transition-colors"
            >
              <Star
                size={32}
                className={cn(
                  (hoverRating || rating) >= n ? "fill-neon-pink text-neon-pink" : "text-text-muted",
                  "transition-colors"
                )}
              />
            </button>
          ))}
        </div>

        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          className="glass-input w-full resize-none"
          placeholder="Comentário (opcional)"
        />

        {error && <p className="text-xs text-red-400">{error}</p>}
        {done && (
          <p className="flex items-center gap-1.5 text-xs text-neon-green">
            <Check size={13} /> Obrigado pela avaliação!
          </p>
        )}

        <NeonButton type="submit" disabled={saving || disabled} className="w-full justify-center">
          {saving ? "Enviando..." : "Enviar Avaliação"}
        </NeonButton>
      </form>
    </GlassCard>
  );
}
