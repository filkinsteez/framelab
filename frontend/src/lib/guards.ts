/**
 * UI locks to prevent conflicts between operations
 */
export const uiLocks = {
  drawing: false,
  transforming: false,
  jobGuards: new Set<string>(), // frameId or 'gap:index' for "Next Frame"
};

/**
 * Check if strip reordering is allowed
 * Disabled during drawing, transforming, or when AI jobs are running
 */
export function canReorderStrip(): boolean {
  return !uiLocks.drawing && 
         !uiLocks.transforming && 
         uiLocks.jobGuards.size === 0;
}

