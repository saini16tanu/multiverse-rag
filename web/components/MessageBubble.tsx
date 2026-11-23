"use client";

import { motion } from "framer-motion";
import type { ChatMessage } from "@/lib/types";
import PortalIcon from "./PortalIcon";
import SourceChip from "./SourceChip";

/** One chat message. User = right (violet), bot = left (dark glass, cyan edge). */
export default function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}
    >
      {!isUser && (
        <span className="mt-1">
          <PortalIcon size={26} spin={false} />
        </span>
      )}
      <div className={`max-w-[85%] sm:max-w-[75%] ${isUser ? "" : "min-w-0"}`}>
        <div
          className={
            isUser
              ? "rounded-2xl rounded-br-md bg-gradient-to-br from-accent-violet to-[#5B21B6] px-4 py-2.5 text-[15px] leading-relaxed text-white shadow-[0_0_24px_rgba(124,58,237,0.3)]"
              : `glass rounded-2xl rounded-bl-md border px-4 py-3 text-[15px] leading-relaxed text-white/80 ${
                  message.error
                    ? "border-rose-500/40 shadow-[0_0_20px_rgba(244,63,94,0.15)]"
                    : "border-accent-cyan/20 shadow-[0_0_22px_rgba(0,214,255,0.10)]"
                }`
          }
        >
          <p className="whitespace-pre-wrap break-words">{message.text}</p>
        </div>
        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {message.sources.map((s) => (
              <SourceChip key={s.page} source={s} />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
