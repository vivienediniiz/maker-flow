"use client";

import Link from "next/link";
import { Topbar } from "@/components/dashboard/Topbar";
import { GlassCard } from "@/components/ui/GlassCard";
import { NeonButton } from "@/components/ui/NeonButton";
import { useSubscription } from "@/components/dashboard/SubscriptionContext";
import { MessageCircle, HelpCircle, Star } from "lucide-react";

const SUPPORT_WHATSAPP_NUMBER = "5531971983044";

export default function SupportPage() {
  const { paid } = useSubscription();

  return (
    <>
      <Topbar title="Suporte" />
      <main className="px-6 py-8 md:px-8">
        <GlassCard padding="lg" className="mx-auto max-w-lg space-y-5 text-center">
          {paid ? (
            <>
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-neon-gradient-soft text-neon-green">
                <MessageCircle size={26} />
              </div>
              <div>
                <h2 className="font-display text-xl">Suporte Direto</h2>
                <p className="mt-2 text-sm text-text-secondary">
                  Precisa de ajuda com o StudioMaker, sua impressora conectada, ou tem uma dúvida sobre sua conta?
                  Fale direto com a gente pelo WhatsApp — respondemos o mais rápido possível.
                </p>
              </div>
              <a
                href={`https://wa.me/${SUPPORT_WHATSAPP_NUMBER}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <NeonButton className="w-full justify-center">
                  <MessageCircle size={16} /> Conversar no WhatsApp
                </NeonButton>
              </a>
            </>
          ) : (
            <>
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-neon-gradient-soft text-neon-pink">
                <HelpCircle size={26} />
              </div>
              <div>
                <h2 className="font-display text-xl">Central de Ajuda</h2>
                <p className="mt-2 text-sm text-text-secondary">
                  Suporte direto via WhatsApp é exclusivo dos planos pagos. Enquanto isso, confira nossa central
                  de ajuda com as dúvidas mais comuns.
                </p>
              </div>
              <Link href="/dashboard/help" className="block">
                <NeonButton className="w-full justify-center">
                  <HelpCircle size={16} /> Ver Central de Ajuda
                </NeonButton>
              </Link>
              <Link href="/dashboard/subscription" className="text-xs text-neon-pink hover:underline">
                Ou assine um plano pra ter suporte direto →
              </Link>
            </>
          )}
        </GlassCard>

        <GlassCard padding="lg" className="mx-auto mt-6 max-w-lg space-y-3 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-neon-gradient-soft text-neon-pink">
            <Star size={22} />
          </div>
          <div>
            <h2 className="font-display text-lg">Sugestões e Avaliação</h2>
            <p className="mt-1 text-sm text-text-secondary">
              Tem uma ideia, uma reclamação, ou quer avaliar o StudioMaker? Sua opinião nos ajuda a melhorar.
            </p>
          </div>
          <Link href="/dashboard/feedback" className="block">
            <NeonButton variant="outline" className="w-full justify-center">
              <Star size={16} /> Enviar Feedback
            </NeonButton>
          </Link>
        </GlassCard>
      </main>
    </>
  );
}
