"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { NewSaleModal } from "@/components/dashboard/NewSaleModal";
import { SaleSuccessModal } from "@/components/dashboard/SaleSuccessModal";
import type { QuoteWithClient } from "@/lib/types";

/**
 * Botão "Novo Orçamento" do Dashboard — abre direto o mesmo modal de "Nova
 * Venda Manual" usado em Vendas, sem passar pela Calculadora. O maker só
 * seleciona/preenche produto, cliente, frete e valores.
 */
export function NewOrderButton() {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [successQuote, setSuccessQuote] = useState<QuoteWithClient | null>(null);

  return (
    <>
      <button type="button" onClick={() => setModalOpen(true)} className="neon-btn">
        <Plus size={16} /> Novo Orçamento
      </button>

      <NewSaleModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={(createdQuote) => {
          router.refresh();
          if (createdQuote) setSuccessQuote(createdQuote);
        }}
      />
      <SaleSuccessModal quote={successQuote} onClose={() => setSuccessQuote(null)} />
    </>
  );
}
