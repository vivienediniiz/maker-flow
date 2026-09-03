"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";

/** Um trecho do título: texto puro ou texto com o gradiente neon aplicado. */
export type HeadingSegment = string | { text: string; neon: true };

type Props = {
  segments: HeadingSegment[];
  /** Tag semântica do título. */
  as?: "h1" | "h2" | "h3" | "p";
  className?: string;
  delay?: number;
  stagger?: number;
  /** "scroll" anima quando entra na viewport; "mount" anima assim que a página carrega. */
  trigger?: "scroll" | "mount";
};

const EASE = [0.16, 1, 0.3, 1] as const;

const wordVariants: Variants = {
  hidden: { y: "110%", opacity: 0 },
  visible: { y: "0%", opacity: 1, transition: { duration: 0.55, ease: EASE } },
};

const wordVariantsReduced: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
};

/**
 * Título que sobe palavra por palavra quando entra na viewport.
 * Cada palavra fica dentro de um wrapper com overflow-hidden — a folga vertical
 * (pb/-mb) existe pra máscara não cortar descendentes tipo "g" e "y".
 */
export function AnimatedHeading({
  segments,
  as = "h2",
  className,
  delay = 0,
  stagger = 0.045,
  trigger = "scroll",
}: Props) {
  const reduced = useReducedMotion();
  const MotionTag = motion[as];

  // Achata os segmentos em palavras, guardando de qual segmento cada uma veio.
  const words = segments.flatMap((segment, segmentIdx) => {
    const text = typeof segment === "string" ? segment : segment.text;
    const neon = typeof segment !== "string";
    return text
      .split(/\s+/)
      .filter(Boolean)
      .map((word, wordIdx) => ({ word, neon, key: `${segmentIdx}-${wordIdx}` }));
  });

  return (
    <MotionTag
      className={className}
      variants={{ visible: { transition: { staggerChildren: reduced ? 0 : stagger, delayChildren: delay } } }}
      initial="hidden"
      {...(trigger === "mount"
        ? { animate: "visible" as const }
        : { whileInView: "visible" as const, viewport: { once: true, margin: "-80px" } })}
    >
      {words.map(({ word, neon, key }) => (
        <span key={key} className="mr-[0.25em] inline-block overflow-hidden pb-[0.14em] align-bottom -mb-[0.14em]">
          <motion.span
            variants={reduced ? wordVariantsReduced : wordVariants}
            className={neon ? "neon-text inline-block" : "inline-block"}
          >
            {word}
          </motion.span>
        </span>
      ))}
    </MotionTag>
  );
}
