"use client";

import { motion } from "framer-motion";
import { BrowserFrame } from "./BrowserFrame";
import { CalculatorMockup } from "./mockups/CalculatorMockup";
import { AffiliationMockup } from "./mockups/AffiliationMockup";
import { IntegrationsMockup } from "./mockups/IntegrationsMockup";

// Três telas flutuantes, sem título — alinhadas pelo centro vertical (é assim
// que estão no Figma: larguras iguais de 336px, gap de 78px, alturas naturais).
const SCREENS = [
  { title: "studiomaker3d.com.br/calculator", Mockup: CalculatorMockup },
  { title: "studiomaker3d.com.br/affiliates", Mockup: AffiliationMockup },
  { title: "studiomaker3d.com.br/integrations", Mockup: IntegrationsMockup },
];

export function ScreensShowcaseSection() {
  return (
    <section className="mx-auto max-w-[1164px] px-6 py-24 md:px-12 lg:py-[153px]">
      <div className="grid grid-cols-1 items-center gap-10 sm:grid-cols-2 lg:grid-cols-3 lg:gap-[78px]">
        {SCREENS.map((screen, i) => (
          <motion.div
            key={screen.title}
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, ease: "easeOut", delay: i * 0.08 }}
          >
            <BrowserFrame title={screen.title}>
              <screen.Mockup />
            </BrowserFrame>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
