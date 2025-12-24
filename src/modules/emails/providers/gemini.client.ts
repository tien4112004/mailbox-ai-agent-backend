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
      // Try provider-specific surfaces in order of preference
      let response: any;
      // Gemini surface (preferred)
      if (this.ai?.gemini?.embedContent) {
        response = await this.ai.gemini.embedContent({ model: this.model, contents: [text] });
      } else if (this.ai?.models?.embedContent) {
        // Older SDK exposes .models.embedContent
        response = await this.ai.models.embedContent({ model: this.model, contents: [text] });
      } else if (typeof this.ai?.embedContent === 'function') {
        // Fallback generic name
        response = await this.ai.embedContent({ model: this.model, contents: [text] });
      } else {
        throw new Error('Gemini SDK does not expose embedContent method');
      }

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

  async embedMany(texts: string[]): Promise<number[][]> {
    if (!Array.isArray(texts) || texts.length === 0) return [];
    try {
      let response: any;
      if (this.ai?.gemini?.embedContent) {
        response = await this.ai.gemini.embedContent({ model: this.model, contents: texts });
      } else if (this.ai?.models?.embedContent) {
        response = await this.ai.models.embedContent({ model: this.model, contents: texts });
      } else if (typeof this.ai?.embedContent === 'function') {
        response = await this.ai.embedContent({ model: this.model, contents: texts });
      } else {
        throw new Error('Gemini SDK does not expose embedContent method');
      }

      // Parse embeddings from response - expect an array of embeddings
      const embeddings: number[][] = [];

      // Try known shapes
      if (response?.embeddings && Array.isArray(response.embeddings)) {
        for (const e of response.embeddings) {
          const emb = e?.embedding || e?.vector || null;
          if (Array.isArray(emb)) embeddings.push(emb as number[]);
        }
        if (embeddings.length) return embeddings;
      }

      if (response?.data && Array.isArray(response.data)) {
        for (const d of response.data) {
          const emb = d?.embedding || d?.outputs?.[0]?.embedding || null;
          if (Array.isArray(emb)) embeddings.push(emb as number[]);
        }
        if (embeddings.length) return embeddings;
      }

      // Fallback: scan any nested arrays for numeric arrays matching number[] length
      const foundAll: number[][] = [];
      const visit = (obj: any) => {
        if (!obj || typeof obj !== 'object') return null;
        if (Array.isArray(obj) && obj.length > 0 && typeof obj[0] === 'number') return obj as number[];
        for (const k of Object.keys(obj)) {
          const v = obj[k];
          const r = visit(v);
          if (r) return r;
        }
        return null;
      };

      // Try to extract up to texts.length embeddings scanning response
      const flat = JSON.stringify(response);
      // worst-case, fallback to per-item embed by calling embed for each text
      this.logger.debug('Falling back to per-item embedding for embedMany');
      const results: number[][] = [];
      for (const t of texts) {
        const emb = await this.embed(t);
        results.push(emb);
      }
      return results;
    } catch (err) {
      this.logger.error('Gemini embedMany error', err as any);
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
