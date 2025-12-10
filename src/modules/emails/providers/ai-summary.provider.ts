import { SummaryLength, SummaryTone, AIProvider } from '../constants/summary.constants';

export interface SummarizeEmailDto {
  length?: SummaryLength;
  tone?: SummaryTone;
  provider?: AIProvider;
  customInstructions?: string;
}

export interface EmailContent {
  subject: string;
  from: string;
  body: string;
  date?: string;
}

export interface AIProviderConfig {
  apiKey: string;
  model: string;
}

export interface IAISummaryProvider {
  isConfigured(): boolean;

  generateSummary(
    emailContent: EmailContent,
    options: SummarizeEmailDto,
  ): Promise<string>;

  getProviderName(): string;

  getModel(): string;
}

export { AIProvider };

export abstract class BaseAISummaryProvider implements IAISummaryProvider {
  protected readonly logger: any; // Logger will be injected by NestJS
  protected config: AIProviderConfig;

  constructor(config: AIProviderConfig) {
    this.config = config;
  }

  abstract generateSummary(
    emailContent: EmailContent,
    options: SummarizeEmailDto,
  ): Promise<string>;

  abstract getProviderName(): string;
  abstract getModel(): string;

  isConfigured(): boolean {
    return !!this.config?.apiKey;
  }

  protected buildPrompt(
    emailContent: EmailContent,
    options: SummarizeEmailDto,
  ): string {
    const lengthInstructions = this.getLengthInstructions(options.length);
    const toneInstructions = this.getToneInstructions(options.tone);
    const languageInstructions = this.getLanguageInstructions(emailContent);
    const customInstructions = options.customInstructions
      ? `\n\nAdditional instructions: ${options.customInstructions}`
      : '';

    return `You are an expert email summarization assistant. Your task is to create a concise and meaningful summary of the email below.

INSTRUCTIONS:
${lengthInstructions}
${toneInstructions}
${languageInstructions}

EMAIL DETAILS:
From: ${emailContent.from}
Subject: ${emailContent.subject}
${emailContent.date ? `Date: ${emailContent.date}` : ''}

EMAIL BODY:
${emailContent.body}
${customInstructions}

REQUIREMENTS:
1. Focus on the main purpose and key information
2. Preserve important dates, names, and deadlines
3. Highlight any action items or requests
4. Avoid redundancy and unnecessary details
5. Use the specified tone consistently

RESPONSE FORMAT:
Provide only the summary without any preamble or explanation. Start directly with the summary.`;
  }

  protected getLengthInstructions(length?: SummaryLength): string {
    switch (length) {
      case SummaryLength.SHORT:
        return 'SUMMARY LENGTH: Create a very brief summary in 1-2 sentences (max 50 words). Focus only on the absolute essentials.';
      case SummaryLength.LONG:
        return 'SUMMARY LENGTH: Create a comprehensive summary in 3-5 sentences (max 200 words). Include context and supporting details.';
      case SummaryLength.MEDIUM:
      default:
        return 'SUMMARY LENGTH: Create a balanced summary in 2-3 sentences (max 100 words). Include main points and important details.';
    }
  }

  protected getToneInstructions(tone?: SummaryTone): string {
    switch (tone) {
      case SummaryTone.FORMAL:
        return 'TONE: Use professional, formal language. Maintain business-appropriate terminology.';
      case SummaryTone.CASUAL:
        return 'TONE: Use casual, friendly language. Make it conversational and easy to understand.';
      case SummaryTone.TECHNICAL:
        return 'TONE: Use technical, precise language. Include relevant technical terms and specifications where appropriate.';
      default:
        return 'TONE: Use professional, formal language. Maintain business-appropriate terminology.';
    }
  }

  protected getLanguageInstructions(emailContent: EmailContent): string {
    const detectedLanguage = this.detectLanguage(emailContent);
    return `LANGUAGE: Summarize in ${detectedLanguage}. Ensure the summary maintains the same language as the original email.`;
  }

  protected detectLanguage(emailContent: EmailContent): string {
    // Combine subject and body for better detection
    const text = `${emailContent.subject} ${emailContent.body}`.substring(0, 500);

    // Simple language detection based on common patterns
    // Vietnamese
    if (/[\u0103\u0109\u0111\u0129\u0169\u01A1\u01B0]/.test(text)) {
      return 'Vietnamese';
    }

    // Chinese (Simplified or Traditional)
    if (/[\u4E00-\u9FFF]/.test(text)) {
      return 'Chinese';
    }

    // Japanese
    if (/[\u3040-\u309F\u30A0-\u30FF]/.test(text)) {
      return 'Japanese';
    }

    // Korean
    if (/[\uAC00-\uD7AF]/.test(text)) {
      return 'Korean';
    }

    // Russian
    if (/[а-яёА-ЯЁ]/.test(text)) {
      return 'Russian';
    }

    // Arabic
    if (/[\u0600-\u06FF]/.test(text)) {
      return 'Arabic';
    }

    // Thai
    if (/[\u0E00-\u0E7F]/.test(text)) {
      return 'Thai';
    }

    // German words
    if (/\b(Der|Die|Das|Ein|Eine|Einen|Einem|Eines|ist|sind|werden|haben|hat)\b/i.test(text)) {
      return 'German';
    }

    // Spanish/Portuguese words
    if (/\b(el|la|de|que|es|en|una|un|por|para|con)\b/i.test(text)) {
      // Check for more Spanish indicators
      if (/\b(español|hola|buenos|dias|noche|adiós)\b/i.test(text)) {
        return 'Spanish';
      }
      // Check for Portuguese indicators
      if (/\b(português|olá|bom|dia|noite|adeus|você)\b/i.test(text)) {
        return 'Portuguese';
      }
    }

    // French words
    if (/\b(le|la|de|que|est|en|un|une|par|pour|avec)\b/i.test(text)) {
      if (/\b(français|bonjour|bonsoir|au|revoir|vous)\b/i.test(text)) {
        return 'French';
      }
    }

    // Italian
    if (/\b(il|lo|la|gli|le|di|da|che|è|sono|per|con)\b/i.test(text)) {
      if (/\b(italiano|ciao|buongiorno|buonasera|arrivederci)\b/i.test(text)) {
        return 'Italian';
      }
    }

    // Default to English
    return 'English';
  }

  protected sanitizeEmailBody(body: string): string {
    if (!body) return '';

    // Remove excessive newlines
    let sanitized = body.replace(/\n{3,}/g, '\n\n');

    // Remove common email signatures and footers
    const footerPatterns = [
      /^--\s*\n[\s\S]*$/m, // Unix-style signature separator
      /^_+\s*\n[\s\S]*$/m, // Underline separator
      /^Best regards[\s\S]*$/m,
      /^Sincerely[\s\S]*$/m,
      /^Thanks[\s\S]*$/m,
    ];

    for (const pattern of footerPatterns) {
      sanitized = sanitized.replace(pattern, '').trim();
    }

    // Limit body to first 4000 characters to avoid token limits
    if (sanitized.length > 4000) {
      sanitized = sanitized.substring(0, 4000) + '...[truncated]';
    }

    return sanitized.trim();
  }
}
