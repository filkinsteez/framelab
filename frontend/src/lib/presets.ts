import type { NextFramePresetKey } from './storyboard-types';

/**
 * Presets for "Next Frame" AI generation
 * These prompts are appended to the user's prompt to maintain continuity
 */
export const NEXT_FRAME_PRESETS: Record<NextFramePresetKey, string> = {
  continue: 'Continue the same scene naturally.',
  push_camera_forward: 'Continue with camera slightly closer (10% push-in).',
  advance_time: 'Advance scene by a few minutes. Preserve subjects and palette.',
  darker_lighting: 'Continue with slightly darker lighting and more contrast.',
  wider_composition: 'Widen composition slightly while preserving subjects.',
};

