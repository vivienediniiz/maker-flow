"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Check, ArrowRight } from "lucide-react";
import { BrowserFrame } from "./BrowserFrame";
import { StoreMockup } from "./mockups/StoreMockup";

const HIGHLIGHTS = ["Sem intermediários", "Margem 100%", "Checkout seguro", "Rastreamento automático"];

export function StoreShowcaseSection() {
  return (
    <section className="mx-auto mt-28 max-w-5xl px-6 md:px-12">
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="grid grid-cols-1 items-center gap-8 md:grid-cols-2 md:gap-12"
      >
        <div>
          <BrowserFrame title="app.studiomaker.com.br/loja/studio-diniz" className="mx-auto max-w-md">
            <div className="min-h-[340px]">
              <StoreMockup />
            </div>
          </BrowserFrame>
        </div>
        <div>
          <h2 className="font-display text-3xl md:text-4xl">🏪 Sua Própria Loja Online</h2>
          <p className="mt-3 leading-relaxed text-text-secondary">
            Venda produtos 3D diretamente com checkout integrado — sua vitrine pública, com seu link, sem depender
            de marketplace nenhum.
          </p>
          <ul className="mt-5 space-y-2.5">
            {HIGHLIGHTS.map((h) => (
              <li key={h} className="flex items-center gap-2 text-sm text-text-secondary">
                <Check size={16} className="text-neon-green" /> {h}
              </li>
            ))}
          </ul>
          <Link href="/signup" className="neon-btn mt-6 inline-flex">
            Ativar Minha Loja <ArrowRight size={16} />
          </Link>
        </div>
      </motion.div>
    </section>
  );
}
