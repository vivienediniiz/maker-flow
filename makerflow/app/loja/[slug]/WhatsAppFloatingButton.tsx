"use client";

import { buildWhatsAppLink } from "@/components/ui/WhatsAppLink";

interface WhatsAppFloatingButtonProps {
  phone: string;
  defaultMessage: string | null;
  /** Nome do produto em foco (modal aberto) — entra na mensagem quando presente. */
  productName?: string;
}

export function WhatsAppFloatingButton({ phone, defaultMessage, productName }: WhatsAppFloatingButtonProps) {
  const message = productName
    ? `Olá! Tenho uma dúvida sobre o produto: ${productName}`
    : defaultMessage || "Olá! Tenho uma dúvida sobre a loja.";

  return (
    <a
      href={buildWhatsAppLink(phone, message)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Falar no WhatsApp"
      className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] shadow-lg transition-transform hover:scale-105"
    >
      <svg width={28} height={28} viewBox="0 0 24 24" fill="#FFFFFF" aria-hidden>
        <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.87 9.87 0 0 0 4.74 1.21h.01c5.46 0 9.9-4.45 9.9-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm5.8 14.13c-.24.68-1.4 1.3-1.93 1.35-.5.05-1.02.24-3.42-.71-2.88-1.15-4.73-4.06-4.87-4.25-.14-.19-1.16-1.55-1.16-2.96 0-1.4.74-2.09 1-2.38.26-.28.57-.35.76-.35.19 0 .38 0 .55.01.18.01.42-.07.65.5.24.58.82 2 .89 2.14.07.15.12.32.02.51-.1.19-.15.31-.3.48-.15.17-.31.37-.44.5-.15.15-.3.31-.13.6.17.29.76 1.25 1.63 2.03 1.12 1 2.06 1.31 2.35 1.46.29.14.46.12.63-.07.17-.19.72-.84.92-1.13.19-.29.38-.24.65-.14.26.1 1.68.79 1.97.93.29.14.48.21.55.33.07.12.07.68-.17 1.36Z" />
      </svg>
    </a>
  );
}
