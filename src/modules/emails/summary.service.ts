import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SummarizeEmailDto, SummaryLength, SummaryTone } from './dto/summarize-email.dto';

interface EmailContent {
  subject: string;
  from: string;
  body: string;
  date?: string;
}

@Injectable()
export class SummaryService {
  private readonly logger = new Logger(SummaryService.name);
  private openaiApiKey: string;
  private openaiApiUrl = 'https://api.openai.com/v1/chat/completions';
  private model = 'gpt-3.5-turbo';

  constructor(private configService: ConfigService) {
    this.openaiApiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!this.openaiApiKey) {
      this.logger.warn('OPENAI_API_KEY is not configured. Summary feature will not work.');
    }
  }

  /**
   * Builds an effective prompt for email summarization with context and constraints
   */
  private buildPrompt(
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
  private getLengthInstructions(length: SummaryLength): string {
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
  private getToneInstructions(tone: SummaryTone): string {
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
  private sanitizeEmailBody(body: string): string {
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

  /**
   * Generate a summary for the email using OpenAI API
   */
  async generateSummary(
    emailContent: EmailContent,
    options: SummarizeEmailDto,
  ): Promise<string> {
    if (!this.openaiApiKey) {
      throw new HttpException(
        'OpenAI API key is not configured',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    try {
      // Sanitize the email body
      const sanitizedBody = this.sanitizeEmailBody(emailContent.body);

      const prompt = this.buildPrompt(
        { ...emailContent, body: sanitizedBody },
        options,
      );

      const response = await fetch(this.openaiApiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content:
                'You are an expert email summarization assistant. Create clear, concise, and actionable summaries.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.5, // More deterministic output
          max_tokens: 300, // Limit response length
          top_p: 0.9,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 401) {
          throw new HttpException(
            'Invalid OpenAI API key',
            HttpStatus.UNAUTHORIZED,
          );
        }
        if (response.status === 429) {
          throw new HttpException(
            'OpenAI API rate limit exceeded',
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }
        throw new Error(
          `OpenAI API error: ${response.statusText} - ${errorData.error?.message || 'Unknown error'}`,
        );
      }

      const data = await response.json();

      if (data.choices && data.choices.length > 0) {
        return data.choices[0].message.content.trim();
      }

      throw new Error('No response from OpenAI API');
    } catch (error) {
      this.logger.error('Error generating summary:', error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Failed to generate summary: ' + error.message,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
