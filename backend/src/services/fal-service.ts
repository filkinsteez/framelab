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
      // Convert data URI to blob and upload to FAL storage for better handling
      let imageUrl = request.imageUrl;
      
      if (imageUrl.startsWith('data:')) {
        console.log('Converting data URI to blob and uploading to FAL storage...');
        try {
          // Convert data URI to blob
          const response = await fetch(imageUrl);
          const blob = await response.blob();
          
          // Upload to FAL storage
          const uploadedUrl = await fal.storage.upload(blob);
          console.log('Uploaded to FAL storage:', uploadedUrl);
          imageUrl = uploadedUrl;
        } catch (uploadError) {
          console.error('Failed to upload to FAL storage, using data URI:', uploadError);
          // Fall back to data URI if upload fails
        }
      }
      
      input.image_urls = [imageUrl]; // Nano Banana expects an array
      
      // Explicitly set aspect_ratio - it seems Nano Banana doesn't always infer correctly
      if (request.aspectRatio) {
        input.aspect_ratio = request.aspectRatio;
        console.log('Explicitly setting aspect_ratio:', input.aspect_ratio);
      }
      
      input.limit_generations = false;
      
      console.log('Using Nano Banana edit');
      console.log('Image URL type:', imageUrl.startsWith('data:') ? 'data URI' : 'hosted URL');
      console.log('aspect_ratio:', input.aspect_ratio);
      console.log('limit_generations:', input.limit_generations);
      console.log('Full input:', JSON.stringify({ ...input, image_urls: '[redacted for brevity]' }, null, 2));
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

export interface ImageTo3DRequest {
  imageUrl: string;
}

export interface ImageTo3DResult {
  task_id: string;
  model_mesh: {
    url: string;
    content_type: string;
    file_size: number;
  } | null;
  pbr_model?: {
    url: string;
    content_type: string;
    file_size: number;
  } | null;
  base_model?: {
    url: string;
    content_type: string;
    file_size: number;
  } | null;
  rendered_image: {
    url: string;
    content_type: string;
    file_size: number;
  } | null;
}

/**
 * Convert image to 3D model using Tripo v2.5
 * Based on: https://fal.ai/models/tripo3d/tripo/v2.5/image-to-3d/api
 */
export async function convertImageTo3D(
  request: ImageTo3DRequest
): Promise<ImageTo3DResult> {
  try {
    console.log('Converting image to 3D with Tripo v2.5...');
    
    // Upload image to FAL storage if it's a data URI
    let imageUrl = request.imageUrl;
    if (imageUrl.startsWith('data:')) {
      console.log('Converting data URI to blob and uploading to FAL storage...');
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      imageUrl = await fal.storage.upload(blob);
      console.log('Uploaded to FAL storage:', imageUrl);
    }
    
    const result = await fal.subscribe('tripo3d/tripo/v2.5/image-to-3d', {
      input: {
        image_url: imageUrl,
        texture: 'HD',
        pbr: true,
      },
      logs: true,
      onQueueUpdate: (update) => {
        console.log('Tripo queue update:', update);
      },
    }) as any;
    
    console.log('Tripo 3D conversion complete:', JSON.stringify(result, null, 2));
    
    // FAL might return data in result.data or directly in result
    const data = result.data || result;
    
    console.log('Extracted data:', JSON.stringify(data, null, 2));
    
    if (!data.task_id) {
      throw new Error('Invalid response from Tripo API - missing task_id');
    }
    
    return {
      task_id: data.task_id,
      model_mesh: data.model_mesh || null,
      pbr_model: data.pbr_model || null,
      base_model: data.base_model || null,
      rendered_image: data.rendered_image || null,
    };
  } catch (error) {
    console.error('Tripo 3D conversion error:', error);
    throw new Error(
      `3D conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

