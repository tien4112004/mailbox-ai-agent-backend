import { HttpException, HttpStatus, Logger } from '@nestjs/common';
import {
  BaseAISummaryProvider,
  EmailContent,
  AIProviderConfig,
} from './ai-summary.provider';
import { SummarizeEmailDto } from '../dto/summarize-email.dto';

export class GeminiAdapter extends BaseAISummaryProvider {
  protected readonly logger = new Logger(GeminiAdapter.name);
  private geminiApiUrl = 'https://generativelanguage.googleapis.com/v1beta/models';

  constructor(config: AIProviderConfig) {
    super(config);
  }

  getProviderName(): string {
    return 'Google Gemini';
  }

  getModel(): string {
    return this.config.model || 'gemini-2.5-flash-lite';
  }

  async generateSummary(
    emailContent: EmailContent,
    options: SummarizeEmailDto,
  ): Promise<string> {
    if (!this.isConfigured()) {
      throw new HttpException(
        'Gemini API key is not configured',
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

      const model = this.getModel();
      const url = `${this.geminiApiUrl}/${model}:generateContent?key=${this.config.apiKey}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          safetySettings: [
            {
              category: 'HARM_CATEGORY_HATE_SPEECH',
              threshold: 'BLOCK_NONE',
            },
            {
              category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
              threshold: 'BLOCK_NONE',
            },
            {
              category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
              threshold: 'BLOCK_NONE',
            },
            {
              category: 'HARM_CATEGORY_HARASSMENT',
              threshold: 'BLOCK_NONE',
            },
          ],
          generationConfig: {
            temperature: 0.5,
            maxOutputTokens: 300,
            topP: 0.9,
            topK: 40,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 401) {
          throw new HttpException(
            'Invalid Gemini API key',
            HttpStatus.UNAUTHORIZED,
          );
        }
        if (response.status === 429) {
          throw new HttpException(
            'Gemini API rate limit exceeded',
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }
        throw new Error(
          `Gemini API error: ${response.statusText} - ${errorData.error?.message || 'Unknown error'}`,
        );
      }

      const data = await response.json();

      // Check for content and extract the summary
      if (
        data.candidates &&
        data.candidates.length > 0 &&
        data.candidates[0].content?.parts?.length > 0
      ) {
        return data.candidates[0].content.parts[0].text.trim();
      }

      // Handle blocked content or safety filters
      if (data.candidates && data.candidates[0].finishReason === 'SAFETY') {
        throw new HttpException(
          'Summary generation blocked by content safety filters',
          HttpStatus.BAD_REQUEST,
        );
      }

      throw new Error('No response from Gemini API');
    } catch (error) {
      this.logger.error('Error generating summary with Gemini:', error);

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
