declare module '@google/genai' {
  export class GoogleGenAI {
    constructor(opts?: { apiKey?: string; vertexai?: boolean; project?: string; location?: string; apiVersion?: string });
    models: {
      embedContent?: (opts: any) => Promise<any>;
      generateContent?: (opts: any) => Promise<any>;
      generateContentStream?: (opts: any) => AsyncIterable<any>;
      // other model methods can be added as needed
      [key: string]: any;
    };
  }

  export default GoogleGenAI;
}
