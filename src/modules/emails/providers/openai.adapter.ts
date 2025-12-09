import { HttpException, HttpStatus, Logger } from '@nestjs/common';
import {
  BaseAISummaryProvider,
  EmailContent,
  AIProviderConfig,
} from './ai-summary.provider';
import { SummarizeEmailDto } from '../dto/summarize-email.dto';

export class OpenAIAdapter extends BaseAISummaryProvider {
  protected readonly logger = new Logger(OpenAIAdapter.name);
  private openaiApiUrl = 'https://api.openai.com/v1/chat/completions';

  constructor(config: AIProviderConfig) {
    super(config);
  }

  getProviderName(): string {
    return 'OpenAI';
  }

  getModel(): string {
    return this.config.model || 'gpt-3.5-turbo';
  }

  async generateSummary(
    emailContent: EmailContent,
    options: SummarizeEmailDto,
  ): Promise<string> {
    if (!this.isConfigured()) {
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
          Authorization: `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.getModel(),
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
      this.logger.error('Error generating summary with OpenAI:', error);

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
