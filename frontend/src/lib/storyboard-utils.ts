import type { StoryboardState, StoryboardFrame } from './storyboard-types';
import { generateId } from './konva-types';

/**
 * Renumber all frames based on array position
 */
export function renumberFrames(frames: StoryboardFrame[]): StoryboardFrame[] {
  return frames.map((f, i) => ({ ...f, frameNumber: i + 1 }));
}

/**
 * Add new blank frame at specified index
 */
export function addFrame(
  state: StoryboardState,
  atIndex: number
): StoryboardState {
  const newFrame: StoryboardFrame = {
    id: generateId(),
    frameNumber: 0, // Will be renumbered
    objects: [],
    createdAt: Date.now(),
  };

  const frames = [
    ...state.frames.slice(0, atIndex),
    newFrame,
    ...state.frames.slice(atIndex),
  ];

  return {
    ...state,
    frames: renumberFrames(frames),
    activeFrameId: newFrame.id,
  };
}

/**
 * Delete frame (prevent deletion if it's the last frame)
 */
export function deleteFrame(
  state: StoryboardState,
  frameId: string
): StoryboardState {
  // Always keep at least one frame
  if (state.frames.length === 1) {
    console.warn('Cannot delete the last frame');
    return state;
  }

  const frameIndex = state.frames.findIndex(f => f.id === frameId);
  if (frameIndex < 0) return state;

  const frames = state.frames.filter(f => f.id !== frameId);

  // Update active frame if we deleted it
  let activeFrameId = state.activeFrameId;
  if (activeFrameId === frameId) {
    // Select the frame before, or the first if we deleted frame 0
    const newIndex = Math.max(0, frameIndex - 1);
    activeFrameId = frames[newIndex]?.id || null;
  }

  return {
    ...state,
    frames: renumberFrames(frames),
    activeFrameId,
  };
}

/**
 * Reorder frames by moving from one index to another
 * Note: Frame numbers are preserved (not renumbered) to maintain frame identity
 */
export function reorderFrames(
  state: StoryboardState,
  fromIndex: number,
  toIndex: number
): StoryboardState {
  if (fromIndex === toIndex) return state;
  if (fromIndex < 0 || fromIndex >= state.frames.length) return state;
  if (toIndex < 0 || toIndex > state.frames.length) return state; // Allow toIndex === length (append to end)

  const frames = [...state.frames];
  const [moved] = frames.splice(fromIndex, 1);
  
  // Adjust toIndex if we removed an element before the insertion point
  const adjustedToIndex = toIndex > fromIndex ? toIndex - 1 : toIndex;
  frames.splice(adjustedToIndex, 0, moved);

  return {
    ...state,
    frames, // Don't renumber - keep original frame numbers
  };
}

/**
 * Update frame's custom label
 */
export function updateFrameLabel(
  state: StoryboardState,
  frameId: string,
  label: string
): StoryboardState {
  return {
    ...state,
    frames: state.frames.map(f =>
      f.id === frameId
        ? { ...f, customLabel: label.trim().slice(0, 30) || undefined }
        : f
    ),
  };
}

/**
 * Duplicate frame (creates copy at next position)
 */
export function duplicateFrame(
  state: StoryboardState,
  frameId: string
): StoryboardState {
  const idx = state.frames.findIndex(f => f.id === frameId);
  if (idx < 0) return state;

  const src = state.frames[idx];
  const dup: StoryboardFrame = {
    ...src,
    id: generateId(),
    frameNumber: 0, // Will be renumbered
    createdAt: Date.now(),
    customLabel: src.customLabel ? `${src.customLabel} (copy)` : undefined,
    generatedFromPrevious: undefined,
    genMeta: undefined,
    thumbnail: undefined,
    // Deep clone objects with new IDs
    objects: src.objects.map(o => ({
      ...o,
      id: generateId(),
    })),
  };

  const frames = [
    ...state.frames.slice(0, idx + 1),
    dup,
    ...state.frames.slice(idx + 1),
  ];

  return {
    ...state,
    frames: renumberFrames(frames),
    activeFrameId: dup.id,
  };
}

/**
 * Update frame's objects (for canvas edits)
 */
export function updateFrameObjects(
  state: StoryboardState,
  frameId: string,
  objects: any[]
): StoryboardState {
  return {
    ...state,
    frames: state.frames.map(f =>
      f.id === frameId ? { ...f, objects } : f
    ),
  };
}

/**
 * Update frame's thumbnail
 */
export function updateFrameThumbnail(
  state: StoryboardState,
  frameId: string,
  thumbnail: string
): StoryboardState {
  return {
    ...state,
    frames: state.frames.map(f =>
      f.id === frameId ? { ...f, thumbnail } : f
    ),
  };
}

/**
 * Set active frame
 */
export function setActiveFrame(
  state: StoryboardState,
  frameId: string | null
): StoryboardState {
  return {
    ...state,
    activeFrameId: frameId,
  };
}

