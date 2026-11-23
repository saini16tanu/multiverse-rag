"use client";

import { useCallback, useEffect, useState } from "react";
import { MotionConfig, motion, useInView } from "framer-motion";
import { useRef } from "react";
import Navbar from "@/components/Navbar";
import ScrollIntro, { scrollToChatbot } from "@/components/ScrollIntro";
import UploadPanel from "@/components/UploadPanel";
import ChatWindow from "@/components/ChatWindow";
import { ApiError, BACKEND_DOWN, askQuestion, checkHealth, getStatus } from "@/lib/api";
import type { ChatMessage, DocInfo } from "@/lib/types";
import { framePath } from "@/lib/frames";

const newId = () => Math.random().toString(36).slice(2);

export default function Home() {
  const [online, setOnline] = useState<boolean | null>(null);
  const [doc, setDoc] = useState<DocInfo | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [waiting, setWaiting] = useState(false);
  const chatRef = useRef<HTMLElement>(null);
  const chatInView = useInView(chatRef, { amount: 0.35 });

  // Check the backend now and every 10 seconds (green / red dot)
  useEffect(() => {
    let alive = true;
    const ping = async () => {
      const ok = await checkHealth();
      if (alive) setOnline(ok);
    };
    ping();
    const t = setInterval(ping, 10000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  // On page load: is a PDF already loaded in the backend?
  useEffect(() => {
    getStatus()
      .then((s) => {
        if (s.has_pdf && s.file)
          setDoc({ file: s.file, pages: s.pages, chunks: s.chunks, avgChunkLength: s.avg_chunk_length ?? null });
      })
      .catch(() => {});
  }, []);

  const send = useCallback(
    async (question: string) => {
      // last 4 real messages = history for follow-up questions
      const history = messages
        .filter((m) => !m.error)
        .slice(-4)
        .map((m) => ({ role: m.role, text: m.text }));
      setMessages((prev) => [...prev, { id: newId(), role: "user", text: question }]);
      setWaiting(true);
      try {
        const r = await askQuestion(question, history);
        setMessages((prev) => [...prev, { id: newId(), role: "bot", text: r.answer, sources: r.sources }]);
      } catch (e) {
        const msg = e instanceof ApiError ? e.message : BACKEND_DOWN;
        if (e instanceof ApiError && e.backendDown) setOnline(false);
        setMessages((prev) => [...prev, { id: newId(), role: "bot", text: msg, error: true }]);
      } finally {
        setWaiting(false);
      }
    },
    [messages],
  );

  return (
    <MotionConfig reducedMotion="user">
      <Navbar online={online} />

      <main className="relative">
        <ScrollIntro />

        {/* PART 2: the chatbot */}
        <section id="chatbot" ref={chatRef} className="relative isolate min-h-screen scroll-mt-0">
          {/* Background: the assembled portal, blurred and faint, BEHIND everything, never clickable */}
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
            <div
              className="absolute inset-0 scale-110 bg-cover bg-center opacity-30 blur-md"
              style={{ backgroundImage: `url(${framePath(1)})` }}
            />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(11,6,24,0.35),#010101_80%)]" />
            <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-void to-transparent" />
          </div>

          <div className="relative z-10 mx-auto flex max-w-7xl flex-col gap-4 px-4 pb-10 pt-20 sm:px-6 lg:grid lg:h-screen lg:grid-cols-[320px_1fr] lg:gap-5">
            <UploadPanel
              doc={doc}
              onUploaded={(d) => { setDoc(d); setMessages([]); }}
              onReset={() => { setMessages([]); }}
            />
            <ChatWindow doc={doc} messages={messages} waiting={waiting} onSend={send} onClear={() => setMessages([])} />
          </div>

          {online === false && (
            <p className="relative z-10 mx-auto max-w-7xl px-6 pb-6 text-center text-xs text-rose-300/80">{BACKEND_DOWN}</p>
          )}
        </section>

        <footer className="relative z-10 border-t border-white/[0.06] py-8 text-center text-sm text-white/45">
          Built by Tanu Saini · Mirai School of Technology ·{" "}
          <a href="https://github.com/saini16tanu" target="_blank" rel="noreferrer" className="text-white/70 underline-offset-4 hover:text-white hover:underline">
            GitHub
          </a>
        </footer>
      </main>

      {/* Always-available shortcut while the intro is on screen */}
      <motion.button
        onClick={scrollToChatbot}
        animate={{ opacity: chatInView ? 0 : 1, y: chatInView ? 12 : 0 }}
        style={{ pointerEvents: chatInView ? "none" : "auto" }}
        className="glass gradient-border fixed bottom-5 right-5 z-40 rounded-full px-4 py-2 text-sm font-medium text-white/90 shadow-[0_0_24px_rgba(124,58,237,0.35)] [--gb-fill:rgba(10,10,12,0.8)]"
      >
        Skip to chatbot ↓
      </motion.button>
    </MotionConfig>
  );
}
