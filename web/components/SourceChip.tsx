"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Source } from "@/lib/api";

/** "Page 12" chip. Hover, focus or tap shows the snippet in a glass tooltip. */
export default function SourceChip({ source }: { source: Source }) {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-block" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        aria-expanded={open}
        className="rounded-full border border-accent-cyan/25 bg-accent-cyan/[0.06] px-2.5 py-0.5 text-xs font-medium text-accent-cyan/90 transition hover:border-accent-cyan/60 hover:bg-accent-cyan/10"
      >
        Page {source.page}
      </button>
      <AnimatePresence>
        {open && (
          <motion.span
            role="tooltip"
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="glass absolute bottom-full left-0 z-30 mb-2 block w-64 rounded-xl border border-white/10 p-3 text-xs leading-relaxed text-white/70 shadow-[0_10px_40px_rgba(0,0,0,0.6)] sm:w-72"
          >
            <span className="mb-1 block font-semibold text-white/85">Page {source.page}</span>
            “{source.snippet}…”
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}
