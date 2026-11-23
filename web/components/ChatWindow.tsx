"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { ChatMessage, DocInfo } from "@/lib/types";
import MessageBubble from "./MessageBubble";
import PortalIcon from "./PortalIcon";

const SUGGESTIONS = ["Summarise this document", "What are the main topics?", "Explain the most important concept"];

type Props = {
  doc: DocInfo | null;
  messages: ChatMessage[];
  waiting: boolean;
  onSend: (text: string) => void;
  onClear: () => void;
};

export default function ChatWindow({ doc, messages, waiting, onSend, onClear }: Props) {
  const [text, setText] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const disabled = !doc || waiting;

  // auto-scroll to the newest message
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, waiting]);

  // grow the input with the text (up to a limit)
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }, [text]);

  const send = (value = text) => {
    const q = value.trim();
    if (!q || disabled) return;
    onSend(q);
    setText("");
  };

  return (
    <div className="glass gradient-border-soft relative flex h-[70vh] min-h-[480px] flex-col overflow-hidden rounded-3xl [--gb-fill:rgba(10,10,12,0.72)] lg:h-full">
      {/* header */}
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-5 py-3.5">
        <h2 className="truncate text-sm font-semibold text-white/90">
          {doc ? <>Chat with <span className="text-accent-cyan/90">{doc.file}</span></> : "Chat"}
        </h2>
        <button
          onClick={onClear}
          disabled={messages.length === 0}
          className="shrink-0 rounded-full border border-white/10 px-3 py-1 text-xs text-white/60 transition hover:border-white/25 hover:text-white disabled:opacity-30"
        >
          Clear chat
        </button>
      </div>

      {/* messages */}
      <div ref={listRef} className="thin-scroll flex-1 space-y-5 overflow-y-auto px-4 py-6 sm:px-6">
        {!doc && messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <PortalIcon size={56} />
            <p className="text-white/55">Upload a PDF to start chatting.</p>
          </div>
        )}

        {doc && messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-5 text-center">
            <PortalIcon size={48} />
            <p className="text-white/60">Ask anything about your PDF.</p>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="gradient-border-soft rounded-full px-4 py-2 text-sm text-white/75 transition hover:text-white hover:shadow-[0_0_18px_rgba(0,214,255,0.25)] [--gb-fill:rgba(10,10,12,0.9)]"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}

        <AnimatePresence>
          {waiting && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-3">
              <PortalIcon size={26} />
              <div className="glass flex gap-1.5 rounded-2xl rounded-bl-md border border-accent-cyan/20 px-4 py-3.5">
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="h-2 w-2 rounded-full bg-accent-cyan shadow-[0_0_8px_rgba(0,214,255,0.9)]"
                    animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.1, 0.8] }}
                    transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.18 }}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* input */}
      <form
        onSubmit={(e) => { e.preventDefault(); send(); }}
        className="border-t border-white/[0.06] p-3 sm:p-4"
      >
        <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-1.5 pl-4 transition focus-within:border-accent-violet/50 focus-within:shadow-[0_0_20px_rgba(124,58,237,0.2)]">
          <textarea
            ref={inputRef}
            rows={1}
            value={text}
            disabled={disabled}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              // Enter sends, Shift+Enter makes a new line
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                send();
              }
            }}
            placeholder={doc ? "Ask a question about your PDF…" : "Upload a PDF first"}
            className="max-h-40 flex-1 resize-none bg-transparent py-2 text-[15px] text-white/90 placeholder:text-white/30 focus:outline-none disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={disabled || !text.trim()}
            aria-label="Send"
            className="btn-gradient flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white transition hover:brightness-110 active:scale-95 disabled:opacity-35 disabled:shadow-none"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </button>
        </div>
      </form>
    </div>
  );
}
