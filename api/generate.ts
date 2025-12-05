import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as fal from '@fal-ai/serverless-client';

// Configure FAL client
fal.config({
  credentials: process.env.FAL_KEY,
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt, imageUrl, strength, guidanceScale, numImages, aspectRatio } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt is required and must be a string' });
    }

    // Use Nano Banana edit if we have a base image, otherwise text-to-image
    const modelId = imageUrl ? 'fal-ai/nano-banana/edit' : 'fal-ai/fast-sdxl';

    const input: any = {
      prompt,
      num_images: numImages || 4,
    };

    if (imageUrl && modelId === 'fal-ai/nano-banana/edit') {
      let finalImageUrl = imageUrl;

      // Upload data URI to FAL storage
      if (imageUrl.startsWith('data:')) {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        finalImageUrl = await fal.storage.upload(blob);
      }

      input.image_urls = [finalImageUrl];
      if (aspectRatio) input.aspect_ratio = aspectRatio;
      input.limit_generations = false;
    } else {
      input.guidance_scale = guidanceScale || 7.5;
      if (aspectRatio) input.aspect_ratio = aspectRatio;
    }

    const result = await fal.subscribe(modelId, {
      input,
      logs: true,
    }) as any;

    const images = result.images || [];

    return res.status(200).json({
      success: true,
      data: {
        images: images.map((img: any) => ({
          url: img.url,
          width: img.width || 1024,
          height: img.height || 1024,
          contentType: img.content_type || 'image/png',
        })),
        seed: result.seed || Date.now(),
        prompt,
      },
    });
  } catch (error) {
    console.error('Generation error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Generation failed',
    });
  }
}
