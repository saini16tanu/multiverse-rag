"use client";

import { useRef } from "react";
import {
  motion,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";
import FrameCanvas from "./FrameCanvas";

type Align = "left" | "right" | "center";

type Beat = {
  start: number;
  end: number;
  align: Align;
  title: string;
  text: string;
  chips?: string[];
  first?: boolean; // visible from the very top
  last?: boolean;  // stays visible until the end
};

// The story, as scroll percentages of the 500vh section
const BEATS: Beat[] = [
  { start: 0.12, end: 0.27, align: "left", title: "1. Upload & Load",
    text: "You upload a PDF. PyPDFLoader reads it page by page, keeping every page number." },
  { start: 0.27, end: 0.42, align: "right", title: "2. Clean",
    text: "Broken words joined. Page numbers removed. Repeated headers and footers erased." },
  { start: 0.42, end: 0.6, align: "left", title: "3. Chunk: Recursive Character Splitting",
    text: "The text is cut at the biggest natural break first: paragraph, then line, then sentence, then word.",
    chips: ["800 characters", "120 overlap"] },
  { start: 0.6, end: 0.75, align: "right", title: "4. Embed",
    text: "Each chunk becomes 384 numbers with all-MiniLM-L6-v2. Similar meaning lands close together." },
  { start: 0.75, end: 0.88, align: "center", title: "5. Vector Database",
    text: "All chunks are stored in Chroma. Your question finds the 4 closest chunks." },
  { start: 0.88, end: 1, align: "center", title: "6. Answer", last: true,
    text: "Gemini reads only those chunks and answers with page numbers. If the answer is not in your PDF, it says so." },
];

export function scrollToChatbot() {
  document.getElementById("chatbot")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function ScrollIntro() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });

  // Scroll progress drives the frame directly (no spring, no easing delay).
  // FrameCanvas turns it into a frame index with Math.round.

  // The frames go from "assembled" to "exploded".
  // Steps 1-4 break the document down (play forward),
  // steps 5-6 put it back together into an answer (play backward).
  const framePos = useTransform(scrollYProgress, [0, 0.74, 1], [0, 1, 0]);

  return (
    <section id="how-it-works" ref={ref} className="relative h-[500vh]">
      {/* Invisible anchors for the navbar links (top = progress x 400vh) */}
      <span id="chunking" className="absolute left-0 top-[204vh] h-px w-px" aria-hidden />
      <span id="vector-db" className="absolute left-0 top-[326vh] h-px w-px" aria-hidden />

      <div className="sticky top-0 h-screen w-full overflow-hidden">
        <FrameCanvas position={framePos} />

        {/* Soft vignette so the text is easy to read and the edges melt into the page */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(1,1,1,0.85)_100%)]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-void to-transparent" />

        <HeroBeat progress={scrollYProgress} />
        {BEATS.map((b) => (
          <StoryBeat key={b.title} beat={b} progress={scrollYProgress} />
        ))}

        <ProgressRail progress={scrollYProgress} />
      </div>
    </section>
  );
}

/** 0-12%: the title, centered */
function HeroBeat({ progress }: { progress: MotionValue<number> }) {
  const opacity = useTransform(progress, [0, 0.08, 0.12], [1, 1, 0]);
  const y = useTransform(progress, [0, 0.12], [0, -40]);
  const pointerEvents = useTransform(opacity, (o) => (o > 0.4 ? "auto" : "none"));

  return (
    <motion.div
      style={{ opacity, y, pointerEvents }}
      className="absolute inset-0 z-10 flex flex-col items-center justify-center px-6 text-center"
    >
      <div className="pointer-events-none absolute h-72 w-[38rem] max-w-full rounded-full bg-[radial-gradient(ellipse,rgba(11,6,24,0.85),transparent_70%)]" />
      <motion.h1
        initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        className="text-glow relative text-5xl font-extrabold tracking-tight text-white/90 sm:text-7xl md:text-8xl"
      >
        MULTIVERSE RAG
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="relative mt-5 max-w-xl text-lg text-white/70 sm:text-xl"
      >
        Chat with any PDF. Every answer comes from your file.
      </motion.p>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 0.6 }}
        className="relative mt-12 flex flex-col items-center gap-4"
      >
        <span className="text-xs uppercase tracking-[0.3em] text-white/45">Scroll to see how it works</span>
        <motion.span
          className="block h-10 w-px bg-gradient-to-b from-accent-cyan/80 to-transparent"
          animate={{ scaleY: [0.4, 1, 0.4], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          style={{ originY: 0 }}
        />
        <button
          onClick={scrollToChatbot}
          className="text-sm text-white/60 underline decoration-accent-cyan/50 underline-offset-4 transition hover:text-white"
        >
          Skip to chatbot →
        </button>
      </motion.div>
    </motion.div>
  );
}

function StoryBeat({ beat, progress }: { beat: Beat; progress: MotionValue<number> }) {
  const { start, end, align, last } = beat;
  const fade = Math.min(0.03, (end - start) / 4);

  // fade in at the start, hold, fade out at the end (the last beat stays)
  const opacity = useTransform(
    progress,
    last ? [start, start + fade, 1] : [start, start + fade, end - fade, end],
    last ? [0, 1, 1] : [0, 1, 1, 0],
  );
  const shift = align === "left" ? -40 : align === "right" ? 40 : 0;
  const x = useTransform(progress, [start, start + fade], [shift, 0]);
  const y = useTransform(progress, [start, start + fade], [align === "center" ? 30 : 0, 0]);
  const pointerEvents = useTransform(opacity, (o) => (o > 0.4 ? "auto" : "none"));

  const position =
    align === "left"
      ? "items-end justify-start sm:items-center pb-24 sm:pb-0"
      : align === "right"
        ? "items-end justify-end sm:items-center pb-24 sm:pb-0"
        : "items-end justify-center pb-24 sm:pb-20 text-center";

  return (
    <motion.div style={{ opacity, pointerEvents }} className={`absolute inset-0 z-10 flex px-6 sm:px-12 lg:px-20 ${position}`}>
      <motion.div style={{ x, y }} className="relative max-w-md">
        {/* dark glow behind the text so it reads over the bright portal */}
        <div className="pointer-events-none absolute -inset-10 rounded-full bg-[radial-gradient(ellipse,rgba(1,1,1,0.8),rgba(11,6,24,0.5)_50%,transparent_75%)]" />
        <div className="relative">
          <h2 className="text-glow text-3xl font-bold tracking-tight text-white/90 sm:text-4xl">{beat.title}</h2>
          <p className="mt-4 text-base leading-relaxed text-white/65 sm:text-lg">{beat.text}</p>
          {beat.chips && (
            <div className={`mt-5 flex flex-wrap gap-2 ${align === "center" ? "justify-center" : ""}`}>
              {beat.chips.map((c) => (
                <span key={c} className="gradient-border-soft rounded-full px-3 py-1 text-xs font-medium text-white/80 [--gb-fill:rgba(10,10,12,0.85)]">
                  {c}
                </span>
              ))}
            </div>
          )}
          {last && (
            <button
              onClick={scrollToChatbot}
              className="btn-gradient mt-7 rounded-full px-7 py-3 text-sm font-semibold text-white transition hover:brightness-110 active:scale-[0.98]"
            >
              Start chatting
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

/** A thin line on the right that shows how far through the story you are */
function ProgressRail({ progress }: { progress: MotionValue<number> }) {
  return (
    <div className="pointer-events-none absolute right-5 top-1/2 hidden h-40 w-px -translate-y-1/2 bg-white/10 md:block">
      <motion.div
        className="h-full w-full origin-top bg-gradient-to-b from-accent-violet to-accent-cyan"
        style={{ scaleY: progress }}
      />
    </div>
  );
}
