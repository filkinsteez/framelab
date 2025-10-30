/**
 * Snapping utilities for Konva canvas
 */

const SNAP_THRESHOLD = 5; // pixels

export interface SnapResult {
  x: number;
  y: number;
  snappedToVerticalCenter: boolean;
  snappedToHorizontalCenter: boolean;
  snappedToLeft: boolean;
  snappedToRight: boolean;
  snappedToTop: boolean;
  snappedToBottom: boolean;
}

/**
 * Snap position to frame edges and center guides
 */
export function snapToFrame(
  x: number,
  y: number,
  objectWidth: number,
  objectHeight: number,
  frameW: number,
  frameH: number
): SnapResult {
  let snappedX = x;
  let snappedY = y;

  const result: SnapResult = {
    x,
    y,
    snappedToVerticalCenter: false,
    snappedToHorizontalCenter: false,
    snappedToLeft: false,
    snappedToRight: false,
    snappedToTop: false,
    snappedToBottom: false,
  };

  // Calculate object center
  const objectCenterX = x + objectWidth / 2;
  const objectCenterY = y + objectHeight / 2;

  // Frame center lines
  const frameCenterX = frameW / 2;
  const frameCenterY = frameH / 2;

  // Snap to vertical center
  if (Math.abs(objectCenterX - frameCenterX) < SNAP_THRESHOLD) {
    snappedX = frameCenterX - objectWidth / 2;
    result.snappedToVerticalCenter = true;
  }

  // Snap to horizontal center
  if (Math.abs(objectCenterY - frameCenterY) < SNAP_THRESHOLD) {
    snappedY = frameCenterY - objectHeight / 2;
    result.snappedToHorizontalCenter = true;
  }

  // Snap to left edge
  if (Math.abs(x) < SNAP_THRESHOLD) {
    snappedX = 0;
    result.snappedToLeft = true;
  }

  // Snap to right edge
  if (Math.abs(x + objectWidth - frameW) < SNAP_THRESHOLD) {
    snappedX = frameW - objectWidth;
    result.snappedToRight = true;
  }

  // Snap to top edge
  if (Math.abs(y) < SNAP_THRESHOLD) {
    snappedY = 0;
    result.snappedToTop = true;
  }

  // Snap to bottom edge
  if (Math.abs(y + objectHeight - frameH) < SNAP_THRESHOLD) {
    snappedY = frameH - objectHeight;
    result.snappedToBottom = true;
  }

  result.x = snappedX;
  result.y = snappedY;

  return result;
}

