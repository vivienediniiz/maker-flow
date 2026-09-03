import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { pixGraceDaysLeft } from "@/lib/pix";

export function PixRenewalBanner({ paidUntil }: { paidUntil: string }) {
  const daysLeft = pixGraceDaysLeft(paidUntil);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-red-500/30 bg-red-500/10 px-6 py-3 text-sm text-red-300 md:px-8">
      <div className="flex items-center gap-2.5">
        <AlertTriangle size={16} className="text-red-400" />
        <span>
          Seu pagamento Pix venceu —{" "}
          <strong className="font-numeric">
            {daysLeft > 0 ? `${daysLeft} ${daysLeft === 1 ? "dia" : "dias"} de tolerância restantes` : "último dia de tolerância"}
          </strong>{" "}
          antes de voltar pro plano gratuito.
        </span>
      </div>
      <Link
        href="/pricing"
        className="shrink-0 rounded-pill bg-red-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-red-400"
      >
        Renovar agora
      </Link>
    </div>
  );
}