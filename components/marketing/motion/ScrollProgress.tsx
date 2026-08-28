"use client";

import { motion, useReducedMotion, useScroll, useSpring } from "framer-motion";

/** Barra fina de progresso da página, fixada no topo (fica logo abaixo do header sticky). */
export function ScrollProgress() {
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 26, restDelta: 0.001 });

  return (
    <motion.div
      aria-hidden
      className="fixed inset-x-0 top-0 z-50 h-[3px] origin-left bg-neon-gradient"
      style={{ scaleX: reduced ? scrollYProgress : scaleX }}
    />
  );
}
