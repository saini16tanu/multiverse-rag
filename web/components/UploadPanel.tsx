"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, animate, motion, useReducedMotion } from "framer-motion";
import { ApiError, uploadPdf } from "@/lib/api";
import type { DocInfo } from "@/lib/types";

const STEPS = ["Upload", "Load", "Clean", "Chunk", "Embed", "Vector DB", "Ready"];
const MAX_MB = 20;

type Props = {
  doc: DocInfo | null;
  onUploaded: (doc: DocInfo) => void;
  onReset: () => void;
};

/** Left sidebar: drop zone -> step tracker -> stats. */
export default function UploadPanel({ doc, onUploaded, onReset }: Props) {
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const [showDrop, setShowDrop] = useState(!doc);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (doc && !busy) setShowDrop(false);
  }, [doc, busy]);

  const start = async (file: File | undefined) => {
    if (!file || busy) return;
    setError(null);
    if (!file.name.toLowerCase().endsWith(".pdf")) return setError("Please upload a PDF file.");
    if (file.size > MAX_MB * 1024 * 1024) return setError(`This PDF is bigger than ${MAX_MB} MB.`);

    // The backend does everything in one request, so we light up the steps while we wait.
    setBusy(true);
    setStep(0);
    const timer = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 2)), 650);
    try {
      const r = await uploadPdf(file);
      clearInterval(timer);
      setStep(STEPS.length - 1); // all done
      await new Promise((res) => setTimeout(res, 600));
      onUploaded({ file: r.file, pages: r.pages, chunks: r.chunks, avgChunkLength: r.avg_chunk_length });
      setShowDrop(false);
    } catch (e) {
      clearInterval(timer);
      setError(e instanceof ApiError ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <aside className="glass gradient-border-soft flex flex-col gap-5 rounded-3xl p-5 [--gb-fill:rgba(10,10,12,0.72)] lg:h-full lg:overflow-y-auto thin-scroll">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-white/40">Your document</p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(e) => start(e.target.files?.[0])}
      />

      <AnimatePresence mode="wait">
        {busy ? (
          <motion.ol key="steps" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-2.5">
            {STEPS.map((s, i) => {
              const done = i < step || step === STEPS.length - 1;
              const active = i === step && !done;
              return (
                <li key={s} className="flex items-center gap-3 text-sm">
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full border text-[10px] transition-all duration-500 ${
                      done
                        ? "border-accent-cyan bg-accent-cyan/20 text-accent-cyan shadow-[0_0_12px_rgba(0,214,255,0.6)]"
                        : active
                          ? "animate-pulse border-accent-violet bg-accent-violet/30 shadow-[0_0_12px_rgba(124,58,237,0.7)]"
                          : "border-white/15"
                    }`}
                  >
                    {done ? "✓" : ""}
                  </span>
                  <span className={done ? "text-white/85" : active ? "text-white" : "text-white/35"}>{s}</span>
                </li>
              );
            })}
          </motion.ol>
        ) : showDrop || !doc ? (
          <motion.button
            key="drop"
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); start(e.dataTransfer.files?.[0]); }}
            className={`relative flex min-h-[170px] flex-col items-center justify-center gap-2 rounded-2xl px-4 py-8 text-center transition ${
              drag ? "bg-accent-violet/10" : "bg-white/[0.02] hover:bg-white/[0.04]"
            }`}
          >
            {/* glowing dashed gradient border */}
            <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
              <defs>
                <linearGradient id="dz" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#7C3AED" />
                  <stop offset="1" stopColor="#00D6FF" />
                </linearGradient>
              </defs>
              <rect x="1" y="1" width="calc(100% - 2px)" height="calc(100% - 2px)" rx="16" fill="none" stroke="url(#dz)" strokeWidth="1.5" strokeDasharray="8 12" className="dash-anim" style={{ filter: "drop-shadow(0 0 4px rgba(124,58,237,0.6))" }} />
            </svg>
            <span className="text-2xl">⇪</span>
            <span className="text-sm font-medium text-white/85">Drop your PDF here or click to browse</span>
            <span className="text-xs text-white/40">PDF only · max {MAX_MB} MB</span>
          </motion.button>
        ) : (
          <motion.div key="stats" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-3">
            <p className="truncate text-sm font-semibold text-white/90" title={doc.file}>📄 {doc.file}</p>
            <div className="grid grid-cols-2 gap-2">
              <Stat label="Pages" value={doc.pages} />
              <Stat label="Chunks" value={doc.chunks} />
              <Stat label="Avg chunk length" value={doc.avgChunkLength} suffix=" chars" />
              <Stat label="Dimensions" value={384} />
              <div className="col-span-2 rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
                <p className="text-[11px] text-white/40">Method</p>
                <p className="text-sm font-medium text-white/85">Recursive Character Splitting</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs leading-relaxed text-rose-200/90">{error}</p>}

      {doc && !busy && !showDrop && (
        <button
          onClick={() => { onReset(); setShowDrop(true); }}
          className="gradient-border rounded-full px-4 py-2 text-sm font-medium text-white/85 transition hover:shadow-[0_0_18px_rgba(124,58,237,0.4)]"
        >
          Upload another PDF
        </button>
      )}
    </aside>
  );
}

/** Small stat card with a number that counts up. */
function Stat({ label, value, suffix = "" }: { label: string; value: number | null; suffix?: string }) {
  const reduce = useReducedMotion();
  const [n, setN] = useState(0);
  useEffect(() => {
    if (value == null) return;
    if (reduce) return setN(value);
    const c = animate(0, value, { duration: 1.2, ease: [0.22, 1, 0.36, 1], onUpdate: (v) => setN(Math.round(v)) });
    return () => c.stop();
  }, [value, reduce]);
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
      <p className="text-[11px] text-white/40">{label}</p>
      <p className="text-lg font-bold tabular-nums text-white/90">
        {value == null ? "—" : n}
        {value != null && <span className="text-xs font-normal text-white/40">{suffix}</span>}
      </p>
    </div>
  );
}
