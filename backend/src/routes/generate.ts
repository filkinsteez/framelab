import { Router, type Request, type Response } from 'express';
import { generateImages, getGenerationStatus, convertImageTo3D } from '../services/fal-service.js';

const router = Router();

/**
 * POST /api/generate
 * Generate images using Nano Banana model
 */
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const { prompt, imageUrl, strength, guidanceScale, numImages, aspectRatio } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({
        error: 'Prompt is required and must be a string',
      });
    }

    console.log('=== GENERATION REQUEST ===');
    console.log('Prompt:', prompt);
    console.log('Has imageUrl:', !!imageUrl);
    console.log('ImageUrl length:', imageUrl?.length || 0);
    console.log('ImageUrl preview:', imageUrl?.substring(0, 100) || 'none');
    console.log('Strength:', strength);
    console.log('Aspect ratio:', aspectRatio);
    console.log('Num images:', numImages);

    const result = await generateImages({
      prompt,
      imageUrl,
      strength,
      guidanceScale,
      numImages,
      aspectRatio,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Generation error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Generation failed',
    });
  }
});

/**
 * GET /api/generate/:requestId
 * Get status of a generation request
 */
router.get('/generate/:requestId', async (req: Request, res: Response) => {
  try {
    const { requestId } = req.params;
    
    if (!requestId) {
      return res.status(400).json({ error: 'Request ID is required' });
    }
    
    const status = await getGenerationStatus(requestId);

    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Status check failed',
    });
  }
});

/**
 * POST /api/convert-to-3d
 * Convert an image to a 3D model using Tripo v2.5
 */
router.post('/convert-to-3d', async (req: Request, res: Response) => {
  try {
    const { imageUrl } = req.body;

    if (!imageUrl || typeof imageUrl !== 'string') {
      return res.status(400).json({
        error: 'Image URL is required and must be a string',
      });
    }

    console.log('=== IMAGE TO 3D REQUEST ===');
    console.log('Has imageUrl:', !!imageUrl);
    console.log('ImageUrl length:', imageUrl.length);

    const result = await convertImageTo3D({ imageUrl });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('3D conversion error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : '3D conversion failed',
    });
  }
});

export default router;

