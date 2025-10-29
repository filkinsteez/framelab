# Get Started with FrameLab in 5 Minutes

## Step 1: Start the Application (30 seconds)

Open terminal in the project root and run:

```bash
npm run dev
```

You'll see:
```
FrameLab backend server running on port 3001
CORS enabled for: http://localhost:5173

  VITE ready in XXX ms
  ➜  Local:   http://localhost:5173/
```

## Step 2: Open the App (10 seconds)

Open your browser to: **http://localhost:5173**

You should see:
- A blank tldraw canvas
- Toolbar in the top-left corner
- Instructions in the bottom-left corner

## Step 3: Try Drag & Drop (1 minute)

1. Find any image on your computer (PNG, JPEG, GIF)
2. Drag it from your file browser
3. Drop it onto the canvas

**What happens:**
- ✨ Image appears where you dropped it
- 🌊 Ripple effect plays at the drop point
- 🎯 You can now resize, rotate, and move it

## Step 4: Generate AI Images (2 minutes)

1. Click the **💬 Prompt** button in the toolbar
2. A prompt box appears on the canvas
3. Type something creative, like:
   ```
   a majestic lion made of crystals, fantasy art
   ```
4. Click the **Generate** button
5. Wait ~20 seconds (watch the "Generating..." status)
6. A gallery appears with 4 AI-generated variations!

## Step 5: Use Generated Images (30 seconds)

1. Look at the gallery that appeared
2. Click any thumbnail you like
3. That image is added to your canvas as a new shape
4. Move it around, resize it, combine with other images!

## Step 6: Explore More (1 minute)

**Try the 3D View:**
- Click the **🎮 3D View** button
- See your canvas in 3D space
- Drag to rotate, scroll to zoom

**Export Your Creation:**
- Click **📥 PNG** or **📄 JPEG**
- Your artwork downloads automatically
- High resolution (2x) for quality

**Open Settings:**
- Click **⚙️ Settings**
- Adjust ripple intensity
- Change AI generation parameters
- Configure number of images

## That's It!

You're now using FrameLab! 🎉

## What You Can Do

### Creative Workflows

**Collage Creation:**
1. Drop 5-6 images
2. Arrange them artistically
3. Use tldraw tools to draw connections
4. Export as PNG

**AI Art Exploration:**
1. Create multiple prompt boxes
2. Generate variations of a theme
3. Build galleries of different styles
4. Select favorites to canvas

**Mixed Media:**
1. Drop a photo
2. Generate AI variations
3. Combine photos with AI images
4. Add drawings and text (tldraw tools)
5. Export final composition

**3D Visualization:**
1. Create a design on 2D canvas
2. Toggle 3D view
3. Rotate to see from different angles
4. Screenshot for presentation

### Tips for Best Results

**For AI Generation:**
- Be specific: "a red sports car, sunset, photorealistic"
- Use style keywords: "digital art", "oil painting", "sketch"
- Experiment with guidance scale (higher = more literal)

**For Performance:**
- Keep files under 5MB for faster loading
- Avoid having 100+ shapes on canvas
- Close 3D view when not using it

**For Quality Exports:**
- Arrange shapes nicely before export
- Use PNG for graphics with transparency
- Use JPEG for photos (smaller files)

## Common First-Time Questions

**Q: Where are my files saved?**  
A: In the browser (data URIs). Export to download.

**Q: Can I save my canvas?**  
A: Use File > Save (tldraw feature) or export as image.

**Q: Why is generation slow?**  
A: AI processing takes 15-30 seconds. It's creating 4 unique images!

**Q: Can I use my own images for AI?**  
A: Yes! Drop an image, then include it in your prompt.

**Q: What if I get an error?**  
A: Check that the backend is running on port 3001.

## Keyboard Shortcuts

From tldraw:

| Key | Action |
|-----|--------|
| V | Select tool |
| D | Draw tool |
| E | Eraser |
| R | Rectangle |
| O | Ellipse |
| T | Text |
| H | Hand (pan) |
| Delete | Delete selected |
| Ctrl+Z | Undo |
| Ctrl+Shift+Z | Redo |
| Ctrl+A | Select all |
| Ctrl+D | Duplicate |

## Need More Help?

- **README.md** - Full documentation
- **SETUP.md** - Detailed setup instructions
- **TESTING.md** - Feature testing guide
- **API.md** - API documentation

## Have Fun Creating! 🎨

FrameLab combines the power of:
- **tldraw** - Professional canvas editor
- **FAL AI** - State-of-the-art image generation  
- **WebGL** - Beautiful shader effects
- **Three.js** - 3D visualization

All in one easy-to-use application.

Start experimenting and see what you can create!

