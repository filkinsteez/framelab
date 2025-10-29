import type { GenerateRequest, GenerateResponse } from './types';
import { config } from './config';

const API_BASE_URL = config.apiUrl;

/**
 * Client for interacting with the FAL proxy backend
 */
export class FalClient {
  /**
   * Generate images using the Nano Banana model
   */
  static async generate(request: GenerateRequest): Promise<GenerateResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Generation failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Generation request failed:', error);
      throw error;
    }
  }

  /**
   * Get status of a generation request
   */
  static async getStatus(requestId: string): Promise<any> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/generate/${requestId}`
      );

      if (!response.ok) {
        throw new Error('Failed to get generation status');
      }

      return await response.json();
    } catch (error) {
      console.error('Status check failed:', error);
      throw error;
    }
  }
}

