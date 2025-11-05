/**
 * Command pattern for undo/redo
 */
export type Cmd = {
  do: () => void;
  undo: () => void;
  label?: string;
};

/**
 * Dual-stack history: frame-level edits vs strip-level edits
 */
export type FrameHistory = {
  byFrame: Record<string, { past: Cmd[]; future: Cmd[] }>;
  strip: { past: Cmd[]; future: Cmd[] };
};

/**
 * Create empty history
 */
export function createHistory(): FrameHistory {
  return {
    byFrame: {},
    strip: { past: [], future: [] },
  };
}

/**
 * Push and execute a frame-level command
 */
export function pushFrameCmd(h: FrameHistory, frameId: string, cmd: Cmd): FrameHistory {
  // Execute the command
  cmd.do();

  // Initialize frame history if needed
  if (!h.byFrame[frameId]) {
    h.byFrame[frameId] = { past: [], future: [] };
  }

  // Push to past, clear future
  return {
    ...h,
    byFrame: {
      ...h.byFrame,
      [frameId]: {
        past: [...h.byFrame[frameId].past, cmd],
        future: [],
      },
    },
  };
}

/**
 * Undo last frame-level command
 */
export function undoFrame(h: FrameHistory, frameId: string): FrameHistory {
  const frameHistory = h.byFrame[frameId];
  if (!frameHistory || frameHistory.past.length === 0) return h;

  const cmd = frameHistory.past[frameHistory.past.length - 1];
  cmd.undo();

  return {
    ...h,
    byFrame: {
      ...h.byFrame,
      [frameId]: {
        past: frameHistory.past.slice(0, -1),
        future: [cmd, ...frameHistory.future],
      },
    },
  };
}

/**
 * Redo last frame-level command
 */
export function redoFrame(h: FrameHistory, frameId: string): FrameHistory {
  const frameHistory = h.byFrame[frameId];
  if (!frameHistory || frameHistory.future.length === 0) return h;

  const cmd = frameHistory.future[0];
  cmd.do();

  return {
    ...h,
    byFrame: {
      ...h.byFrame,
      [frameId]: {
        past: [...frameHistory.past, cmd],
        future: frameHistory.future.slice(1),
      },
    },
  };
}

/**
 * Push and execute a strip-level command
 */
export function pushStripCmd(h: FrameHistory, cmd: Cmd): FrameHistory {
  // Execute the command
  cmd.do();

  // Push to past, clear future
  return {
    ...h,
    strip: {
      past: [...h.strip.past, cmd],
      future: [],
    },
  };
}

/**
 * Undo last strip-level command
 */
export function undoStrip(h: FrameHistory): FrameHistory {
  if (h.strip.past.length === 0) return h;

  const cmd = h.strip.past[h.strip.past.length - 1];
  cmd.undo();

  return {
    ...h,
    strip: {
      past: h.strip.past.slice(0, -1),
      future: [cmd, ...h.strip.future],
    },
  };
}

/**
 * Redo last strip-level command
 */
export function redoStrip(h: FrameHistory): FrameHistory {
  if (h.strip.future.length === 0) return h;

  const cmd = h.strip.future[0];
  cmd.do();

  return {
    ...h,
    strip: {
      past: [...h.strip.past, cmd],
      future: h.strip.future.slice(1),
    },
  };
}

