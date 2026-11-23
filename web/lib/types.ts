import type { Source } from "./api";

// Info about the PDF that is loaded in the backend.
export type DocInfo = {
  file: string;
  pages: number;
  chunks: number;
  avgChunkLength: number | null;
};

// One message in the chat (kept in React state only).
export type ChatMessage = {
  id: string;
  role: "user" | "bot";
  text: string;
  sources?: Source[];
  error?: boolean;   // red-tinted bubble, not sent as history
  animate?: boolean; // play the typewriter effect once
};
