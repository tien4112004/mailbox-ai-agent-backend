import { SummarizeEmailDto, SummaryLength, SummaryTone } from '../dto/summarize-email.dto';

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

/**
 * Interface for AI summary providers (OpenAI, Gemini, Claude, etc.)
 * Implementing classes should handle all API communication and formatting
 */
export interface IAISummaryProvider {
  /**
   * Check if provider is properly configured
   */
  isConfigured(): boolean;

  /**
   * Generate a summary for email content
   * @param emailContent - Email content to summarize
   * @param options - Summary options (length, tone, custom instructions)
   * @returns Generated summary text
   */
  generateSummary(
    emailContent: EmailContent,
    options: SummarizeEmailDto,
  ): Promise<string>;

  /**
   * Get provider name
   */
  getProviderName(): string;

  /**
   * Get current model being used
   */
  getModel(): string;
}

/**
 * Supported AI providers
 */
export enum AIProvider {
  OPENAI = 'openai',
  GEMINI = 'gemini',
}

/**
 * Base class providing common functionality for all providers
 */
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

  /**
   * Builds an effective prompt for email summarization with context and constraints
   */
  protected buildPrompt(
    emailContent: EmailContent,
    options: SummarizeEmailDto,
  ): string {
    const lengthInstructions = this.getLengthInstructions(options.length);
    const toneInstructions = this.getToneInstructions(options.tone);
    const customInstructions = options.customInstructions
      ? `\n\nAdditional instructions: ${options.customInstructions}`
      : '';

    return `You are an expert email summarization assistant. Your task is to create a concise and meaningful summary of the email below.

INSTRUCTIONS:
${lengthInstructions}
${toneInstructions}

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

  /**
   * Get length-specific instructions for the prompt
   */
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

  /**
   * Get tone-specific instructions for the prompt
   */
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

  /**
   * Sanitize email body by removing excessive whitespace and common email artifacts
   */
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
