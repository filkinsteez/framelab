import type { CanvasObject, ShapeObject, TextObject, PromptBoxObject, GalleryObject } from './konva-types';
import { generateId, createDefaultTransform } from './konva-types';

/**
 * Create a rectangle object
 */
export function createRectangle(x: number, y: number): ShapeObject {
  return {
    id: generateId(),
    type: 'rect',
    w: 100,
    h: 100,
    fill: '#4CAF50',
    stroke: '#333',
    strokeWidth: 2,
    transform: {
      ...createDefaultTransform(),
      x,
      y,
      zIndex: Date.now(),
    },
  };
}

/**
 * Create a circle object
 */
export function createCircle(x: number, y: number): ShapeObject {
  return {
    id: generateId(),
    type: 'circle',
    w: 100,
    h: 100,
    fill: '#1610ff',
    stroke: '#333',
    strokeWidth: 2,
    transform: {
      ...createDefaultTransform(),
      x,
      y,
      zIndex: Date.now(),
    },
  };
}

/**
 * Create a triangle object
 */
export function createTriangle(x: number, y: number): ShapeObject {
  return {
    id: generateId(),
    type: 'triangle',
    w: 100,
    h: 100,
    fill: '#FF5722',
    stroke: '#333',
    strokeWidth: 2,
    transform: {
      ...createDefaultTransform(),
      x,
      y,
      zIndex: Date.now(),
    },
  };
}

/**
 * Create a text object
 */
export function createText(x: number, y: number, text: string = 'Double-click to edit'): TextObject {
  return {
    id: generateId(),
    type: 'text',
    text,
    fontFamily: 'Arial',
    fontSize: 32,
    color: '#000000',
    align: 'left',
    transform: {
      ...createDefaultTransform(),
      x,
      y,
      zIndex: Date.now(),
    },
  };
}

/**
 * Create a prompt box object
 */
export function createPromptBox(x: number, y: number): PromptBoxObject {
  return {
    id: generateId(),
    type: 'promptbox',
    w: 400,
    h: 200,
    prompt: '',
    isGenerating: false,
    transform: {
      ...createDefaultTransform(),
      x,
      y,
      zIndex: Date.now(),
    },
  };
}

/**
 * Create a gallery object
 */
export function createGallery(x: number, y: number, images: any[]): GalleryObject {
  return {
    id: generateId(),
    type: 'gallery',
    w: 600,
    h: 600,
    images,
    columns: 2,
    transform: {
      ...createDefaultTransform(),
      x,
      y,
      zIndex: Date.now(),
    },
  };
}

// ===== Layer Order Functions =====
// Array order determines z-index: first = bottom, last = top

export function bringToFront(objects: CanvasObject[], ids: string[]): CanvasObject[] {
  if (ids.length === 0) return objects;

  // Separate selected and non-selected objects
  const selected = objects.filter(obj => ids.includes(obj.id));
  const nonSelected = objects.filter(obj => !ids.includes(obj.id));

  // Put selected objects at the end (on top)
  return [...nonSelected, ...selected];
}

export function sendToBack(objects: CanvasObject[], ids: string[]): CanvasObject[] {
  if (ids.length === 0) return objects;

  // Separate selected and non-selected objects
  const selected = objects.filter(obj => ids.includes(obj.id));
  const nonSelected = objects.filter(obj => !ids.includes(obj.id));

  // Put selected objects at the beginning (on bottom)
  return [...selected, ...nonSelected];
}

export function bringForward(objects: CanvasObject[], ids: string[]): CanvasObject[] {
  if (ids.length === 0) return objects;

  const result = [...objects];
  
  // Process from end to start to avoid shifting issues
  for (let i = result.length - 2; i >= 0; i--) {
    if (ids.includes(result[i].id)) {
      // Swap with next item if it's not also selected
      if (!ids.includes(result[i + 1].id)) {
        [result[i], result[i + 1]] = [result[i + 1], result[i]];
      }
    }
  }

  return result;
}

export function sendBackward(objects: CanvasObject[], ids: string[]): CanvasObject[] {
  if (ids.length === 0) return objects;

  const result = [...objects];
  
  // Process from start to end to avoid shifting issues
  for (let i = 1; i < result.length; i++) {
    if (ids.includes(result[i].id)) {
      // Swap with previous item if it's not also selected
      if (!ids.includes(result[i - 1].id)) {
        [result[i], result[i - 1]] = [result[i - 1], result[i]];
      }
    }
  }

  return result;
}

export function deleteObjects(objects: CanvasObject[], ids: string[]): CanvasObject[] {
  return objects.filter(obj => !ids.includes(obj.id));
}

export function duplicateObjects(objects: CanvasObject[], ids: string[]): CanvasObject[] {
  const toDuplicate = objects.filter(obj => ids.includes(obj.id));
  
  const duplicated = toDuplicate.map(obj => ({
    ...obj,
    id: generateId(),
    transform: {
      ...obj.transform,
      x: obj.transform.x + 20,
      y: obj.transform.y + 20,
      zIndex: Date.now() + Math.random(),
    },
  }));

  return [...objects, ...duplicated];
}

