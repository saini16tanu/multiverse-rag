"use client";

import { motion, useReducedMotion } from "framer-motion";

/** Small glowing portal: used for the bot avatar and the empty chat. */
export default function PortalIcon({ size = 28, spin = true }: { size?: number; spin?: boolean }) {
  const reduce = useReducedMotion();
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <span className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(0,214,255,0.35),transparent_70%)] blur-[2px]" />
      <motion.span
        className="absolute inset-[12%] rounded-full border-2 border-accent-violet border-r-accent-cyan border-t-transparent"
        animate={spin && !reduce ? { rotate: 360 } : undefined}
        transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
      />
      <span className="absolute inset-[38%] rounded-full bg-white/90 shadow-[0_0_8px_2px_rgba(0,214,255,0.8)]" />
    </span>
  );
}
