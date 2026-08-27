"use client";

import { motion } from "framer-motion";
import { BrowserFrame } from "./BrowserFrame";

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

      {/* Uma única tela, em largura cheia: o dashboard real (screenshot, não mockup em código). */}
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="mt-14"
      >
        <BrowserFrame
          title="app.studiomaker.com.br/dashboard"
          src="/landing/dashboard.png"
          alt="Dashboard real do StudioMaker"
          width={1895}
          height={905}
          sizes="(max-width: 768px) 100vw, 1056px"
        />
      </motion.div>
    </section>
  );
}
