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
      // Use batchEmbedContents if available (preferred for batching)
      // This is the correct method for the new Google GenAI SDK to handle multiple requests in one go
      // Limit is typically 100 requests per batch call, which matches our planned chunkSize

      let response: any;
      const requests = texts.map(t => ({ content: { parts: [{ text: t }] }, model: `models/${this.model}` }));

      // Try accessing the batch method on the model instance (if using getGenerativeModel) or via client
      // The SDK structure can vary, but usually it's on the client or model
      // Based on docs for @google/genai, we might need to use `client.batchEmbedContents`

      // Attempt 1: Check if ai.batchEmbedContents exists (newer SDKs)
      if (typeof this.ai.batchEmbedContents === 'function') {
        response = await this.ai.batchEmbedContents({ requests });
      }
      // Attempt 2: gemini.batchEmbedContents
      else if (this.ai?.gemini?.batchEmbedContents) {
        response = await this.ai.gemini.batchEmbedContents({ requests });
      }
      // Attempt 3: models.batchEmbedContents (older)
      else if (this.ai?.models?.batchEmbedContents) {
        response = await this.ai.models.batchEmbedContents({ requests });
      } else {
        // Fallback to serial execution if batch method not found
        this.logger.warn('Gemini SDK batchEmbedContents not found, falling back to serial');
        return this.embedSequential(texts);
      }

      // Parse response. The structure is usually { embeddings: [ { values: [...] }, ... ] }
      // but let's be robust

      const embeddings: number[][] = [];
      const rawEmbeddings = response?.embeddings || response?.data || [];

      if (Array.isArray(rawEmbeddings)) {
        for (const item of rawEmbeddings) {
          const values = item?.values || item?.embedding || null;
          if (Array.isArray(values)) {
            embeddings.push(values as number[]);
          } else {
            embeddings.push([]); // Keep index alignment even if empty/error
          }
        }
      }

      if (embeddings.length !== texts.length) {
        this.logger.warn(`Gemini batch embedding returned ${embeddings.length} items, expected ${texts.length}`);
      }

      return embeddings;

    } catch (err) {
      this.logger.error('Gemini embedMany error', err as any);
      // Fallback to serial on error (e.g. if batch failed totally)
      try {
        return this.embedSequential(texts);
      } catch (serialErr) {
        throw serialErr;
      }
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
