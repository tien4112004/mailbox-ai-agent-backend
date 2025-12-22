import { GoogleGenAI } from '@google/genai';
import { Logger } from '@nestjs/common';

export class GeminiClient {
  private readonly logger = new Logger(GeminiClient.name);
  private ai: any;

  constructor(private apiKey: string, private model: string) {
    this.ai = new GoogleGenAI({ apiKey: this.apiKey });
  }

  async embed(text: string): Promise<number[]> {
    try {
      const response = await this.ai.models.embedContent({ model: this.model, contents: [text] });

      // SDK typically returns an object with embeddings; try a few shapes
      const emb = response?.embeddings?.[0]?.embedding || response?.data?.[0]?.embedding || response?.outputs?.[0]?.embedding || null;
      if (emb && Array.isArray(emb) && typeof emb[0] === 'number') return emb as number[];

      // try scanning response for numeric array
      const found = (function findEmbedding(obj: any): number[] | null {
        if (!obj || typeof obj !== 'object') return null;
        if (Array.isArray(obj) && obj.length > 0 && typeof obj[0] === 'number') return obj as number[];
        for (const k of Object.keys(obj)) {
          const v = obj[k];
          const r = findEmbedding(v);
          if (r) return r;
        }
        return null;
      })(response);

      if (found) return found;

      this.logger.error('No embedding found in Gemini response', JSON.stringify(response));
      throw new Error('No embedding returned from Gemini SDK');
    } catch (err) {
      this.logger.error('Gemini embed error', err as any);
      throw err;
    }
  }

  async checkModelAvailability(): Promise<boolean> {
    try {
      // Try a very short embed to validate access and model
      await this.embed('test');
      return true;
    } catch (err) {
      this.logger.warn('Gemini model availability check failed: ' + (err as Error).message);
      return false;
    }
  }
}
