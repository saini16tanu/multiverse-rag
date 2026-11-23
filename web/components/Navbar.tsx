"use client";

import { useState } from "react";
import { motion, useMotionValueEvent, useScroll } from "framer-motion";
import { scrollToChatbot } from "./ScrollIntro";

const LINKS = [
  { label: "How it works", href: "#how-it-works" },
  { label: "Chunking", href: "#chunking" },
  { label: "Vector DB", href: "#vector-db" },
  { label: "Chatbot", href: "#chatbot" },
];

/** online: true = green dot, false = red dot, null = still checking */
export default function Navbar({ online }: { online: boolean | null }) {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 40));

  const dot = online === null ? "bg-white/30" : online ? "bg-emerald-400" : "bg-rose-500";
  const dotGlow = online ? "shadow-[0_0_10px_2px_rgba(52,211,153,0.7)]" : "shadow-[0_0_8px_1px_rgba(244,63,94,0.5)]";

  return (
    <motion.header
      className="fixed inset-x-0 top-0 z-50 border-b"
      animate={{
        backgroundColor: scrolled ? "rgba(5,5,5,0.75)" : "rgba(5,5,5,0)",
        borderColor: scrolled ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0)",
        backdropFilter: scrolled ? "blur(14px)" : "blur(0px)",
      }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      <nav className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        <a href="#how-it-works" className="flex items-center gap-2.5" title={online ? "Backend online" : online === false ? "Backend offline" : "Checking backend"}>
          <span className={`h-2 w-2 rounded-full transition-colors duration-500 ${dot} ${online !== null ? dotGlow : ""}`} />
          <span className="text-sm font-bold tracking-[0.18em] text-white/90">MULTIVERSE RAG</span>
        </a>

        <ul className="hidden items-center gap-8 md:flex">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a href={l.href} className="text-sm text-white/55 transition-colors hover:text-white">
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <button
          onClick={scrollToChatbot}
          className="gradient-border rounded-full px-4 py-1.5 text-sm font-medium text-white/90 transition hover:shadow-[0_0_20px_rgba(124,58,237,0.45)] [--gb-fill:#050505]"
        >
          Open Chatbot
        </button>
      </nav>
    </motion.header>
  );
}
