import { Injectable, HttpException, HttpStatus, Logger, Inject } from '@nestjs/common';
import { SummarizeEmailDto } from '../dto/summarize-email.dto';
import { EmailContent, IAISummaryProvider } from '../providers';

@Injectable()
export class SummaryService {
  private readonly logger = new Logger(SummaryService.name);

  constructor(@Inject('AI_SUMMARY_PROVIDER') private readonly provider: IAISummaryProvider) {}

  async generateSummary(
    emailContent: EmailContent,
    options: SummarizeEmailDto,
  ): Promise<string> {
    try {
      this.logger.debug(
        `Generating summary using ${this.provider.getProviderName()} (${this.provider.getModel()})`,
      );

      // Generate summary using Gemini provider
      const summary = await this.provider.generateSummary(emailContent, options);

      return summary;
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

  getProviderInfo(): {
    default: string;
    available: string[];
  } {
    return {
      default: this.provider.getProviderName(),
      available: [this.provider.getProviderName()],
    };
  }
}
