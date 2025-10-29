# FrameLab Testing Guide

## Pre-Test Setup

1. Ensure both servers are running:
   ```bash
   npm run dev
   ```

2. Open browser to http://localhost:5173
3. Open browser DevTools (F12) to monitor console

## Test Suite

### 1. Basic Canvas Operations

- [ ] Canvas loads without errors
- [ ] Can pan by dragging background
- [ ] Can zoom with mouse wheel
- [ ] tldraw toolbar appears
- [ ] Can use tldraw draw tool
- [ ] Can use tldraw select tool
- [ ] Custom toolbar appears in top-left

### 2. Drag & Drop - Images

**Test 2.1: Single Image Drop**
- [ ] Drag an image file from desktop
- [ ] Drop onto canvas
- [ ] Image appears at drop location
- [ ] Image has correct dimensions (scaled if large)
- [ ] Ripple effect plays at drop point
- [ ] Can select the image
- [ ] Can resize the image
- [ ] Can rotate the image
- [ ] Can delete with Delete key

**Test 2.2: Multiple Image Drop**
- [ ] Drag 3 images at once
- [ ] Drop onto canvas
- [ ] All images appear with offset positions
- [ ] Each image can be transformed independently

**Test 2.3: Large Image**
- [ ] Drop image > 2000px
- [ ] Image auto-scales to max 600px
- [ ] Image quality preserved
- [ ] No performance issues

**Test 2.4: Image Formats**
- [ ] PNG file works
- [ ] JPEG file works
- [ ] GIF file works (animated or static)
- [ ] WebP file works

### 3. Drag & Drop - Videos

**Test 3.1: Video Drop**
- [ ] Drag video file (MP4)
- [ ] Drop onto canvas
- [ ] Video shape appears
- [ ] Video has playback controls
- [ ] Can play/pause video
- [ ] Can transform video shape

### 4. AI Generation (Requires FAL API Key)

**Test 4.1: Create Prompt Box**
- [ ] Click "Prompt" button in toolbar
- [ ] Prompt box appears at viewport center
- [ ] Can type in text area
- [ ] Generate button is disabled when empty
- [ ] Generate button enabled when text entered

**Test 4.2: Generate Images**
- [ ] Enter prompt: "a cat wearing sunglasses"
- [ ] Click Generate button
- [ ] Button shows "Generating..." state
- [ ] Button is disabled during generation
- [ ] Wait for completion (10-30 seconds)
- [ ] Gallery appears next to prompt box
- [ ] Gallery contains 4 images
- [ ] Images are different variations

**Test 4.3: Gallery Interaction**
- [ ] Hover over gallery thumbnails
- [ ] Click a thumbnail
- [ ] New image shape created on canvas
- [ ] Image has "AI Generated" badge
- [ ] Can transform the generated image
- [ ] Click X on thumbnail
- [ ] Image removed from gallery

**Test 4.4: Multiple Generations**
- [ ] Create second prompt box
- [ ] Generate different prompt
- [ ] Both galleries remain functional
- [ ] Can distinguish which gallery has which images

### 5. GLSL Shader Effects

**Test 5.1: Ripple on Drop**
- [ ] Drop an image
- [ ] Ripple effect visible at drop point
- [ ] Ripple expands outward
- [ ] Ripple fades after ~1.5 seconds
- [ ] Multiple ripples can overlap

**Test 5.2: Ripple Performance**
- [ ] Drop 5 images rapidly
- [ ] No lag or stuttering
- [ ] Effects animate smoothly
- [ ] Canvas remains responsive

### 6. 3D Viewer

**Test 6.1: Toggle 3D View**
- [ ] Click "3D View" button
- [ ] 3D viewer panel appears top-right
- [ ] Canvas rendered as textured plane
- [ ] Grid visible in background
- [ ] Lighting applied correctly

**Test 6.2: 3D Controls**
- [ ] Drag to rotate view
- [ ] Scroll to zoom
- [ ] Plane rotates smoothly
- [ ] Texture updates in real-time

**Test 6.3: 3D View Sync**
- [ ] With 3D view open, add shape to canvas
- [ ] Shape appears in 3D texture
- [ ] Move shape on canvas
- [ ] 3D texture updates
- [ ] Close 3D view
- [ ] Reopen - view resets to default angle

### 7. Export System

**Test 7.1: PNG Export**
- [ ] Create composition with 2-3 shapes
- [ ] Click "PNG" export button
- [ ] File downloads automatically
- [ ] Filename format: `framelab-export-YYYY-MM-DD...png`
- [ ] Open exported file
- [ ] Resolution is 2x canvas size
- [ ] All shapes visible
- [ ] Quality is high

**Test 7.2: JPEG Export**
- [ ] Click "JPEG" export button
- [ ] File downloads as .jpg
- [ ] File size smaller than PNG
- [ ] Quality acceptable

**Test 7.3: Empty Canvas Export**
- [ ] Clear all shapes
- [ ] Try to export
- [ ] Should handle gracefully (no crash)

### 8. Settings Panel

**Test 8.1: Open Settings**
- [ ] Click Settings (⚙️) button
- [ ] Settings panel appears top-right
- [ ] All controls visible
- [ ] Close button works

**Test 8.2: Ripple Settings**
- [ ] Toggle "Enable Ripples" off
- [ ] Drop image
- [ ] No ripple effect plays
- [ ] Toggle back on
- [ ] Ripple works again
- [ ] Adjust intensity slider
- [ ] Value updates in real-time

**Test 8.3: AI Settings**
- [ ] Adjust strength slider
- [ ] Adjust guidance scale slider
- [ ] Change num images dropdown
- [ ] Values persist during session

### 9. Error Handling

**Test 9.1: Network Errors**
- [ ] Stop backend server
- [ ] Try to generate images
- [ ] Error alert appears
- [ ] Error message is helpful
- [ ] App doesn't crash

**Test 9.2: Invalid Files**
- [ ] Drop a .txt file
- [ ] Console shows warning (unsupported)
- [ ] No error modal
- [ ] App continues working

**Test 9.3: Large Files**
- [ ] Drop file > 10MB
- [ ] Alert shows size limit error
- [ ] File not added to canvas
- [ ] App continues working

**Test 9.4: WebGL Unavailable**
- [ ] Disable hardware acceleration (if possible)
- [ ] Reload app
- [ ] Error boundary catches WebGL error
- [ ] Can still use canvas (no ripple)

### 10. Performance Tests

**Test 10.1: Many Shapes**
- [ ] Add 20+ shapes to canvas
- [ ] Pan and zoom remain smooth
- [ ] Transformations work
- [ ] No memory leaks (check DevTools)

**Test 10.2: Large Canvas**
- [ ] Zoom out to show large area
- [ ] Add shapes across wide area
- [ ] Export still works
- [ ] 3D view handles large texture

**Test 10.3: Long Session**
- [ ] Use app for 10+ minutes
- [ ] Multiple generations
- [ ] Multiple exports
- [ ] No slowdown over time
- [ ] Memory usage stable

### 11. Browser Compatibility

Test on:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

Each browser should:
- [ ] Load canvas correctly
- [ ] WebGL works
- [ ] Drag & drop works
- [ ] Export works

### 12. Mobile/Tablet (Optional)

- [ ] Canvas loads on mobile
- [ ] Touch pan/zoom works
- [ ] Can select shapes
- [ ] Prompt box usable
- [ ] Export works

## Bug Report Template

If you find a bug, report with:

```markdown
**Bug Description:**
Brief description of the issue

**Steps to Reproduce:**
1. Step one
2. Step two
3. ...

**Expected Behavior:**
What should happen

**Actual Behavior:**
What actually happens

**Environment:**
- OS: macOS/Windows/Linux
- Browser: Chrome 120
- Node version: 18.x

**Console Errors:**
```
Paste any console errors here
```

**Screenshots:**
Attach if relevant
```

## Performance Benchmarks

Target metrics:

- Initial load: < 3 seconds
- Time to first interaction: < 1 second
- Generation request: 10-30 seconds (depends on FAL)
- Export (PNG, 2x): < 5 seconds
- Ripple animation: 60 FPS
- Canvas with 50 shapes: > 30 FPS

## Acceptance Criteria (from PRD)

All of these must pass:

- [x] User can drag image onto canvas and it appears
- [x] User can type prompt, click generate, and gallery appears
- [x] User can click gallery thumbnail and image is added to canvas
- [x] Shapes can be moved, resized, rotated using tldraw
- [x] Export produces downloadable PNG/JPEG
- [x] 3D view shows canvas as textured plane
- [x] Ripple effect plays when dropping files
- [x] FAL API key never exposed to frontend
- [x] Settings panel allows configuration
- [x] Error messages are user-friendly

## Automated Testing (Future)

Potential test frameworks:
- Vitest for unit tests
- Playwright for E2E tests
- React Testing Library for component tests

Example unit test:
```typescript
import { describe, it, expect } from 'vitest';
import { validateFileSize } from './file-utils';

describe('validateFileSize', () => {
  it('rejects files larger than limit', () => {
    const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.jpg');
    expect(validateFileSize(largeFile, 10)).toBe(false);
  });
});
```

## Test Data

Use these test images/prompts:

**Prompts:**
- "a serene mountain landscape at sunset"
- "abstract geometric patterns, colorful"
- "a cat wearing a spacesuit, digital art"
- "minimalist logo design"

**Test Images:**
Download free test images from:
- https://unsplash.com
- https://pexels.com
- Create simple colored squares in image editor

## Reporting Results

After testing, document:
- ✅ Pass rate (X/Y tests passed)
- 🐛 Bugs found
- ⚡ Performance issues
- 💡 Improvement suggestions

Happy testing! 🎨

