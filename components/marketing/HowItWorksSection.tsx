"use client";

import { motion } from "framer-motion";
import { LayoutGrid, Calculator, ShoppingBag } from "lucide-react";
import { BrowserFrame } from "./BrowserFrame";
import { DashboardMockup } from "./mockups/DashboardMockup";
import { CalculatorMockup } from "./mockups/CalculatorMockup";
import { IntegrationsMockup } from "./mockups/IntegrationsMockup";

const ITEMS = [
  {
    icon: LayoutGrid,
    title: "Dashboard",
    description:
      "Resumo de vendas por período, margem real e os produtos que mais vendem — tudo num único painel assim que você entra.",
    frameTitle: "app.studiomaker.com.br/dashboard",
    Mockup: DashboardMockup,
  },
  {
    icon: Calculator,
    title: "Calculadora Inteligente",
    description:
      "Some peso, tempo, energia e insumos de várias mesas de impressão de uma vez, defina sua margem e o StudioMaker calcula o custo por unidade e o preço de venda sugerido na hora. Gere o orçamento em PDF e mande o link de cobrança direto pro cliente.",
    frameTitle: "app.studiomaker.com.br/calculator",
    Mockup: CalculatorMockup,
  },
  {
    icon: ShoppingBag,
    title: "Integrações",
    description:
      "Mercado Livre, Mercado Pago, Shopee e TikTok Shop conectam com um clique — pedido novo em qualquer uma dessas plataformas cai automático no seu painel, sem importar nada na mão.",
    frameTitle: "app.studiomaker.com.br/integrations",
    Mockup: IntegrationsMockup,
  },
];

export function HowItWorksSection() {
  return (
    <section className="mx-auto mt-28 max-w-5xl px-6 md:px-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6 }}
        className="mx-auto max-w-2xl text-center"
      >
        <h2 className="font-display text-3xl md:text-4xl">
          Veja como <span className="neon-text">funciona</span>
        </h2>
        <p className="mt-4 text-text-secondary">
          Uma prévia interativa das telas que mais importam no seu dia a dia — direto no navegador, sem instalar
          nada.
        </p>
      </motion.div>

      <div className="mt-16 space-y-20 md:space-y-28">
        {ITEMS.map((item, i) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="grid grid-cols-1 items-center gap-8 md:grid-cols-2 md:gap-12"
          >
            <div className={i % 2 === 1 ? "md:order-2" : ""}>
              <BrowserFrame title={item.frameTitle} className="mx-auto max-w-md">
                <item.Mockup />
              </BrowserFrame>
            </div>
            <div className={i % 2 === 1 ? "md:order-1" : ""}>
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-neon-gradient-soft text-neon-pink">
                <item.icon size={20} />
              </div>
              <h3 className="font-display mt-4 text-2xl">{item.title}</h3>
              <p className="mt-3 leading-relaxed text-text-secondary">{item.description}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
