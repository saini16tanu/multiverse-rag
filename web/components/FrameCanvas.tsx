"use client";

import { useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { FRAME_BG, FRAME_COUNT, framePath } from "@/lib/frames";

type Props = {
  /** 0 = first frame, 1 = last frame */
  position: MotionValue<number>;
};

/**
 * Plays the image sequence on a canvas.
 * - preloads every frame first (with a small loading bar)
 * - draws with requestAnimationFrame, like object-fit: contain
 * - sharp on retina screens (devicePixelRatio, max 2)
 */
export default function FrameCanvas({ position }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const images = useRef<(HTMLImageElement | null)[]>([]);
  const lastDrawn = useRef(-1);
  const rafId = useRef(0);

  const [loaded, setLoaded] = useState(0); // how many frames finished (ok or failed)
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  // Turn the 0..1 position into a frame index
  const toIndex = (v: number) =>
    Math.min(FRAME_COUNT - 1, Math.max(0, Math.round(v * (FRAME_COUNT - 1))));

  // Find the closest frame that has loaded (so we never draw an empty canvas)
  const nearestImage = (index: number) => {
    for (let d = 0; d < FRAME_COUNT; d++) {
      const a = images.current[index - d];
      if (a) return a;
      const b = images.current[index + d];
      if (b) return b;
    }
    return null;
  };

  const draw = (index: number, force = false) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!force && index === lastDrawn.current) return;
    const img = nearestImage(index);
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!img || !ctx) return;
    lastDrawn.current = index;

    const cw = canvas.width;
    const ch = canvas.height;
    ctx.fillStyle = FRAME_BG;
    ctx.fillRect(0, 0, cw, ch);

    // Landscape screens: "cover" fills the screen (it only crops a little, never stretches).
    // Portrait screens (phones): "contain", so the portal is not cut off.
    const cover = cw >= ch;
    const fit = cover ? Math.max : Math.min;
    const scale = fit(cw / img.naturalWidth, ch / img.naturalHeight);
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    const dx = (cw - dw) / 2;
    const dy = (ch - dh) / 2;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, dx, dy, dw, dh);

    // With "cover" the edges are off-screen, so nothing else to draw
    if (cover) return;

    // "contain": feather the 4 edges into the background color, so no hard frame edge shows
    const f = Math.min(dw, dh) * 0.12;
    const fade = (x0: number, y0: number, x1: number, y1: number) => {
      const g = ctx.createLinearGradient(x0, y0, x1, y1);
      g.addColorStop(0, FRAME_BG);
      g.addColorStop(1, "rgba(1,1,1,0)");
      return g;
    };
    ctx.fillStyle = fade(dx, 0, dx + f, 0);
    ctx.fillRect(dx, dy, f, dh);
    ctx.fillStyle = fade(dx + dw, 0, dx + dw - f, 0);
    ctx.fillRect(dx + dw - f, dy, f, dh);
    ctx.fillStyle = fade(0, dy, 0, dy + f);
    ctx.fillRect(dx, dy, dw, f);
    ctx.fillStyle = fade(0, dy + dh, 0, dy + dh - f);
    ctx.fillRect(dx, dy + dh - f, dw, f);
  };

  const scheduleDraw = (force = false) => {
    cancelAnimationFrame(rafId.current);
    rafId.current = requestAnimationFrame(() => draw(toIndex(position.get()), force));
  };

  // 1. Preload all frames
  useEffect(() => {
    let cancelled = false;
    let done = 0;
    let ok = 0;
    images.current = new Array(FRAME_COUNT).fill(null);

    const finishOne = () => {
      done++;
      if (cancelled) return;
      // update the loading bar a few times, not 238 times
      if (done % 6 === 0 || done === FRAME_COUNT) setLoaded(done);
      if (done === FRAME_COUNT) {
        // fallback if the first frame or most frames are missing
        if (!images.current[0] || ok < FRAME_COUNT * 0.8) setFailed(true);
        else {
          setReady(true);
          scheduleDraw(true);
        }
      }
    };

    for (let i = 0; i < FRAME_COUNT; i++) {
      const img = new Image();
      img.decoding = "async";
      img.src = framePath(i + 1);
      img
        .decode()
        .then(() => {
          images.current[i] = img;
          ok++;
        })
        .catch(() => {})
        .finally(finishOne);
    }
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. Keep the canvas the size of the screen (and sharp), redraw on resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      scheduleDraw(true);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 3. Scroll moved -> draw the new frame on the next animation frame
  useMotionValueEvent(position, "change", () => {
    if (ready) scheduleDraw();
  });

  const percent = Math.round((loaded / FRAME_COUNT) * 100);

  return (
    <div className="pointer-events-none absolute inset-0 z-0">
      {failed ? (
        <PortalFallback position={position} />
      ) : (
        // Plain canvas: no CSS filter, no opacity fade, no transition. Each frame is drawn sharp.
        <canvas
          ref={canvasRef}
          className="pointer-events-none block h-full w-full"
          style={{ visibility: ready ? "visible" : "hidden" }}
          aria-hidden
        />
      )}

      {/* Loading bar while frames preload */}
      <AnimatePresence>
        {!ready && !failed && (
          <motion.div
            className="absolute inset-0 flex flex-col items-center justify-center gap-3"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="h-[3px] w-48 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full btn-gradient transition-[width] duration-200"
                style={{ width: `${percent}%` }}
              />
            </div>
            <p className="text-xs tabular-nums tracking-[0.25em] text-white/40">LOADING {percent}%</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Used only if the frames fail: a glowing violet-cyan ring that splits into layers. */
function PortalFallback({ position }: Props) {
  const reduce = useReducedMotion();
  // split apart in the middle of the story, come back together at the end
  const spread = useTransform(position, [0, 0.5, 1], [0, 1, 0.15]);
  const rings = [
    { size: 280, color: "#7C3AED", dir: 1, offset: -1 },
    { size: 230, color: "#00D6FF", dir: -1, offset: 0 },
    { size: 180, color: "#F472B6", dir: 1, offset: 1 },
  ];
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="absolute h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,rgba(124,58,237,0.25),transparent_65%)]" />
      {rings.map((r, i) => (
        <RingLayer key={i} {...r} spread={spread} spin={!reduce} />
      ))}
    </div>
  );
}

function RingLayer({
  size,
  color,
  dir,
  offset,
  spread,
  spin,
}: {
  size: number;
  color: string;
  dir: number;
  offset: number;
  spread: MotionValue<number>;
  spin: boolean;
}) {
  const x = useTransform(spread, (s) => s * offset * 160);
  const scale = useTransform(spread, (s) => 1 - s * 0.12 * Math.abs(offset));
  return (
    <motion.div className="absolute" style={{ x, scale }}>
      <motion.div
        className="rounded-full"
        style={{
          width: size,
          height: size,
          border: `2px solid ${color}`,
          borderTopColor: "transparent",
          boxShadow: `0 0 40px ${color}66, inset 0 0 30px ${color}33`,
        }}
        animate={spin ? { rotate: 360 * dir } : undefined}
        transition={{ duration: 14 - Math.abs(offset) * 4, repeat: Infinity, ease: "linear" }}
      />
    </motion.div>
  );
}
