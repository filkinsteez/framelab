# How to Generate AI Images in FrameLab

## Step-by-Step Visual Guide

### Step 1: Find the Prompt Button

Look at the **top-left corner** of your screen. You'll see a toolbar with buttons:

```
┌─────────────────────────────────────────┐
│  💬      🖼️     │  📥     📄    │ 🎮  │ ⚙️  │
│ Prompt Gallery │  PNG  JPEG  │ 3D  │Set │
└─────────────────────────────────────────┘
```

Click the **💬 Prompt** button (first button on the left).

### Step 2: Prompt Box Appears

A white box will appear in the middle of your canvas that looks like this:

```
┌────────────────────────────────────┐
│ AI Generation Prompt               │
│ ┌────────────────────────────────┐ │
│ │ Describe what you want to      │ │
│ │ generate...                    │ │
│ │                                │ │
│ │                                │ │
│ └────────────────────────────────┘ │
│                                    │
│        [ Generate ]                │
└────────────────────────────────────┘
```

### Step 3: Type Your Prompt

Click inside the text area and type what you want to create, for example:

```
a majestic lion with a golden mane, 
standing on a cliff, sunset lighting, 
cinematic, digital art
```

Or try these:
- "a futuristic city at night, neon lights, cyberpunk"
- "a serene Japanese garden with cherry blossoms"
- "an astronaut floating in space, realistic"
- "abstract colorful swirls, modern art"

### Step 4: Click Generate

Click the green **Generate** button at the bottom of the prompt box.

The button will change to show:
```
┌──────────────┐
│ Generating...│  (grayed out, disabled)
└──────────────┘
```

### Step 5: Wait for Results (15-30 seconds)

The AI is creating your images. Please wait...

### Step 6: Gallery Appears!

A gallery box will appear **to the right** of your prompt box with 4 AI-generated variations:

```
┌─────────────────────────────────────┐
│ Generated Images (4)                │
│ ┌──────────┐  ┌──────────┐        │
│ │  Image 1 │  │  Image 2 │        │
│ │    ×     │  │    ×     │        │
│ └──────────┘  └──────────┘        │
│ ┌──────────┐  ┌──────────┐        │
│ │  Image 3 │  │  Image 4 │        │
│ │    ×     │  │    ×     │        │
│ └──────────┘  └──────────┘        │
└─────────────────────────────────────┘
```

### Step 7: Use Generated Images

**To add an image to your canvas:**
- Click any thumbnail in the gallery
- That image will appear on your canvas as a new shape
- You can move, resize, and rotate it like any other image!

**To remove an image from gallery:**
- Click the small **×** button in the top-right corner of the thumbnail

## 🎯 Quick Test

Try this exact workflow:

1. ✅ Open http://localhost:5175 (note the port!)
2. ✅ Click **💬 Prompt** in top-left toolbar
3. ✅ Type: "a cat wearing sunglasses"
4. ✅ Click **Generate**
5. ✅ Wait 20 seconds
6. ✅ See 4 cat images appear in gallery
7. ✅ Click any cat image
8. ✅ Cat appears on canvas!

## Troubleshooting

### "I clicked Prompt but nothing happened"
- Make sure you're clicking the 💬 button in the toolbar (top-left)
- The prompt box appears in the center of your current view
- Try zooming out if you don't see it

### "Generate button is grayed out"
- Make sure you've typed something in the text area
- The button only enables when there's text

### "Nothing happens when I click Generate"
- Open browser console (F12) and check for errors
- Check that backend is running (you should see "FrameLab backend server running on port 3001" in terminal)
- Verify the API URL is correct

### "I see an error message"
- Check your internet connection
- Verify the FAL API key is correct in `backend/.env`
- Check the backend terminal for error details

## Current Setup

Your app is running on:
- **Frontend:** http://localhost:5175 ⚠️ (Note: port 5175, not 5173!)
- **Backend:** http://localhost:3001 ✅

CORS has been updated to allow all origins in development, so it should work now.

## What's Happening Behind the Scenes

When you click Generate:

1. **Frontend** sends your prompt to **Backend** (http://localhost:3001/api/generate)
2. **Backend** calls FAL AI with your API key
3. **FAL AI** generates 4 unique images using Nano Banana model
4. **Backend** receives image URLs from FAL
5. **Frontend** creates a Gallery shape with the 4 images
6. **You** click thumbnails to add them to canvas!

## Need Help?

**Check browser console:**
- Press F12
- Click "Console" tab
- Look for any red errors

**Check backend logs:**
- Look at the terminal where you ran `npm run dev`
- The backend logs show `[0]` prefix
- Look for error messages

**Still stuck?**
- Restart servers: Stop with Ctrl+C, then `npm run dev`
- Clear browser cache
- Try a different browser

The Prompt button should be clearly visible in the top-left toolbar. Give it a try! 🎨

