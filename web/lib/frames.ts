// Info about the image sequence in public/frames/.
// These numbers come from the real files (238 JPG frames), nothing is guessed.
export const FRAME_COUNT = 238;
export const FRAME_EXT = "jpg";

// Top-left pixel of frame_0001.jpg. The page uses the same color, so frame edges disappear.
export const FRAME_BG = "#010101";

/** Path of one frame. Index starts at 1. */
export function framePath(i: number): string {
  return `/frames/frame_${String(i).padStart(4, "0")}.${FRAME_EXT}`;
}
