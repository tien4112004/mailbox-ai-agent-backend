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
      // 1. Prepare requests
      const requests = texts.map(t => ({
        content: { role: 'user', parts: [{ text: t }] }
      }));

      let response: any;

      // 2. Try to call batchEmbedContents on the client via 'models' property (New SDK @google/genai style)
      if (this.ai?.models?.batchEmbedContents) {
        response = await this.ai.models.batchEmbedContents({
          model: this.model,
          requests,
        });
      }
      // 3. Try legacy or alternative paths
      else if (typeof this.ai?.batchEmbedContents === 'function') {
        response = await this.ai.batchEmbedContents({ model: this.model, requests });
      }
      else {
        this.logger.warn('Gemini SDK batchEmbedContents not found on client.models, falling back to serial');
        return this.embedSequential(texts);
      }

      // 4. Parse output
      // @google/genai response structure: { embeddings: [ { values: [...] }, ... ] }
      const embeddings = response?.embeddings?.map(e => e.values) || [];

      if (embeddings.length !== texts.length) {
        this.logger.warn(`Gemini batch embedding count mismatch: got ${embeddings.length}, expected ${texts.length}`);
        while (embeddings.length < texts.length) embeddings.push([]);
      }

      return embeddings;

    } catch (err) {
      this.logger.error('Gemini embedMany error', err as any);
      // Fallback to serial on error
      return this.embedSequential(texts);
    }
  }

  private async embedSequential(texts: string[]): Promise<number[][]> {
    const results: number[][] = [];
    for (const text of texts) {
      try {
        const emb = await this.embed(text);
        results.push(emb);
        // Rate limit: 1 request every 4 seconds (safe for 15 RPM)
        await new Promise(resolve => setTimeout(resolve, 4000));
      } catch (err) {
        const msg = (err as any)?.message || JSON.stringify(err);
        if (msg.includes('429') || msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED')) {
          // Critical error: Stop immediately and propagate to caller
          throw err;
        }
        this.logger.warn(`Failed to embed text in sequential mode: ${msg}`);
        results.push([]); // Keep alignment for non-critical errors
      }
    }
    return results;
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
