import * as fal from '@fal-ai/serverless-client';
import { config } from '../config.js';

// Configure FAL client
fal.config({
  credentials: config.falApiKey,
});

export interface GenerationRequest {
  prompt: string;
  imageUrl?: string;
  strength?: number;
  guidanceScale?: number;
  numImages?: number;
}

export interface GenerationResult {
  images: Array<{
    url: string;
    width: number;
    height: number;
    contentType: string;
  }>;
  seed: number;
  prompt: string;
}

/**
 * Generate images using FAL's Nano Banana model (or flux-dev for img2img)
 */
export async function generateImages(
  request: GenerationRequest
): Promise<GenerationResult> {
  try {
    // Use flux-dev for img2img if imageUrl provided, otherwise use fast-sdxl
    const modelId = request.imageUrl ? 'fal-ai/flux/dev' : 'fal-ai/fast-sdxl';
    
    console.log(`Using model: ${modelId}`);
    console.log(`Has base image: ${!!request.imageUrl}`);
    console.log(`Image URL length: ${request.imageUrl?.length || 0}`);
    
    const input: any = {
      prompt: request.prompt,
      guidance_scale: request.guidanceScale || 7.5,
      num_images: request.numImages || 4,
    };
    
    // Add img2img parameters if base image provided
    if (request.imageUrl) {
      input.image_url = request.imageUrl;
      input.strength = request.strength || 0.75;
    }
    
    const result = await fal.subscribe(modelId, {
      input,
      logs: true,
      onQueueUpdate: (update) => {
        console.log('Queue update:', update);
      },
    }) as any;

    return {
      images: result.images.map((img: any) => ({
        url: img.url,
        width: img.width,
        height: img.height,
        contentType: img.content_type || 'image/jpeg',
      })),
      seed: result.seed,
      prompt: request.prompt,
    };
  } catch (error) {
    console.error('FAL generation error:', error);
    throw new Error(
      `Image generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get status of a running generation job
 */
export async function getGenerationStatus(requestId: string) {
  try {
    const status = await fal.queue.status('fal-ai/fast-sdxl', {
      requestId,
      logs: true,
    }) as any;
    return status;
  } catch (error) {
    console.error('Failed to get generation status:', error);
    throw error;
  }
}

