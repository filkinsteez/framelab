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
    const { imageUrl } = req.body;

    if (!imageUrl || typeof imageUrl !== 'string') {
      return res.status(400).json({ error: 'Image URL is required and must be a string' });
    }

    let finalImageUrl = imageUrl;

    // Upload data URI to FAL storage
    if (imageUrl.startsWith('data:')) {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      finalImageUrl = await fal.storage.upload(blob);
    }

    const result = await fal.subscribe('tripo3d/tripo/v2.5/image-to-3d', {
      input: {
        image_url: finalImageUrl,
        texture: 'HD',
        pbr: true,
      },
      logs: true,
    }) as any;

    const data = result.data || result;

    if (!data.task_id) {
      throw new Error('Invalid response from Tripo API - missing task_id');
    }

    return res.status(200).json({
      success: true,
      data: {
        task_id: data.task_id,
        model_mesh: data.model_mesh || null,
        pbr_model: data.pbr_model || null,
        base_model: data.base_model || null,
        rendered_image: data.rendered_image || null,
      },
    });
  } catch (error) {
    console.error('3D conversion error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : '3D conversion failed',
    });
  }
}
