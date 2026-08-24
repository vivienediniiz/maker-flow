"use client";

import { motion } from "framer-motion";
import { BrowserFrame } from "./BrowserFrame";
import { DashboardMockup } from "./mockups/DashboardMockup";
import { SidebarMockup } from "./mockups/SidebarMockup";
import { CalculatorMockup } from "./mockups/CalculatorMockup";
import { IntegrationsMockup } from "./mockups/IntegrationsMockup";
import { AffiliationMockup } from "./mockups/AffiliationMockup";

const TILES = [
  {
    title: "app.studiomaker.com.br/dashboard",
    Mockup: DashboardMockup,
    className: "sm:col-span-2",
    minHeight: "min-h-[360px]",
  },
  {
    title: "menu",
    Mockup: SidebarMockup,
    className: "",
    minHeight: "min-h-[360px]",
  },
  {
    title: "app.studiomaker.com.br/calculator",
    Mockup: CalculatorMockup,
    className: "",
    minHeight: "min-h-[420px]",
  },
  {
    title: "app.studiomaker.com.br/integrations",
    Mockup: IntegrationsMockup,
    className: "sm:col-span-2 lg:col-span-1",
    minHeight: "min-h-[420px]",
  },
  {
    title: "app.studiomaker.com.br/affiliates",
    Mockup: AffiliationMockup,
    className: "sm:col-span-2 lg:col-span-1",
    minHeight: "min-h-[300px]",
  },
];

export function HowItWorksSection() {
  return (
    <section className="mx-auto mt-28 max-w-6xl px-6 md:px-12">
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

      <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {TILES.map((tile, i) => (
          <motion.div
            key={tile.title}
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, ease: "easeOut", delay: (i % 3) * 0.08 }}
            className={tile.className}
          >
            <BrowserFrame title={tile.title} className="h-full">
              <div className={tile.minHeight}>
                <tile.Mockup />
              </div>
            </BrowserFrame>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
