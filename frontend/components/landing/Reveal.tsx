"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

const EASE_OUT = [0.22, 1, 0.36, 1] as const;

/** Scroll-triggered reveal. Instant when the user prefers reduced motion. */
export function Reveal({
  children,
  delay = 0,
  y = 18,
  className,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: reduce ? 0 : y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.55, delay: reduce ? 0 : delay, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  );
}

/** Gentle vertical float for decorative product panels. Disabled under reduced motion. */
export function Float({
  children,
  delay = 0,
  distance = 7,
  duration = 7,
  className,
}: {
  children: ReactNode;
  delay?: number;
  distance?: number;
  duration?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      animate={reduce ? undefined : { y: [0, -distance, 0] }}
      transition={{ duration, delay, repeat: Infinity, ease: "easeInOut" }}
    >
      {children}
    </motion.div>
  );
}

export { motion, useReducedMotion, AnimatePresence };
