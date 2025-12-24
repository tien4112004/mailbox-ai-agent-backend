declare module '@google/genai' {
  // Narrowed types for Gemini-only usage
  export interface GeminiEmbedOptions {
    model?: string;
    contents: string[];
    // additional provider-specific options can be added if needed
  }

  export interface GeminiEmbedResponse {
    embeddings?: Array<{ embedding: number[] }>;
    // raw response fallback
    [key: string]: any;
  }

  export interface GeminiGenerateOptions {
    model?: string;
    prompt?: string | any;
    maxTokens?: number;
    temperature?: number;
    topP?: number;
    // other generation options
  }

  export interface GeminiGenerateResponse {
    id?: string;
    content?: string;
    raw?: any;
  }

  export class GoogleGenAI {
    constructor(opts?: { apiKey?: string; project?: string; location?: string });

    // Expose Gemini-specific surface only
    gemini: {
      embedContent?: (opts: GeminiEmbedOptions) => Promise<GeminiEmbedResponse>;
      generateContent?: (opts: GeminiGenerateOptions) => Promise<GeminiGenerateResponse>;
      generateContentStream?: (opts: GeminiGenerateOptions) => AsyncIterable<GeminiGenerateResponse>;
    };
  }

  export default GoogleGenAI;
}
