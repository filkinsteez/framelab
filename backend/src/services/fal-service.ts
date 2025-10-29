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
  aspectRatio?: '9:16' | '16:9' | '1:1';
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
 * Generate images using FAL's Nano Banana model
 */
export async function generateImages(
  request: GenerationRequest
): Promise<GenerationResult> {
  try {
    // Use Nano Banana edit if we have a base image, otherwise text-to-image
    const modelId = request.imageUrl ? 'fal-ai/nano-banana/edit' : 'fal-ai/fast-sdxl';
    
    console.log(`Using model: ${modelId}`);
    console.log(`Has base image: ${!!request.imageUrl}`);
    console.log(`Image URL length: ${request.imageUrl?.length || 0}`);
    
    const input: any = {
      prompt: request.prompt,
      num_images: request.numImages || 4,
    };
    
    // Nano Banana edit requires image_urls (array) and aspect_ratio
    if (request.imageUrl && modelId === 'fal-ai/nano-banana/edit') {
      input.image_urls = [request.imageUrl]; // Nano Banana expects an array
      
      // IMPORTANT: Nano Banana requires aspect_ratio for proper sizing
      // Also set limit_generations to false so it respects our parameters
      input.limit_generations = false;
      
      if (request.aspectRatio) {
        input.aspect_ratio = request.aspectRatio;
      } else {
        console.warn('No aspect ratio provided, defaulting to 1:1');
        input.aspect_ratio = '1:1';
      }
      
      console.log('Using Nano Banana edit');
      console.log('Aspect ratio being sent:', input.aspect_ratio);
      console.log('limit_generations:', input.limit_generations);
      console.log('Full input:', JSON.stringify(input, null, 2).substring(0, 500));
    } else if (!request.imageUrl) {
      // Text-to-image with fast-sdxl
      input.guidance_scale = request.guidanceScale || 7.5;
      
      if (request.aspectRatio) {
        input.aspect_ratio = request.aspectRatio;
      }
    }
    
    console.log('Submitting to FAL model:', modelId);
    console.log('Final input params:', {
      ...input,
      image_urls: input.image_urls ? `[${input.image_urls.length} images]` : undefined,
    });
    
    const result = await fal.subscribe(modelId, {
      input,
      logs: true,
      onQueueUpdate: (update) => {
        console.log('Queue update:', update);
      },
    }) as any;

    console.log('Raw result from FAL:', JSON.stringify(result).substring(0, 500));
    
    // Nano Banana returns images in result.images, each with a url property
    const images = result.images || [];
    
    return {
      images: images.map((img: any) => ({
        url: img.url,
        width: img.width || 1024,
        height: img.height || 1024,
        contentType: img.content_type || 'image/png',
      })),
      seed: result.seed || Date.now(),
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

