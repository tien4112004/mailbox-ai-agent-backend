import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { SummarizeEmailDto } from './dto/summarize-email.dto';
import { EmailContent } from './providers';
import { AIProvider } from './constants/summary.constants';
import { AIProviderFactory } from './providers/ai-provider.factory';

@Injectable()
export class SummaryService {
  private readonly logger = new Logger(SummaryService.name);

  constructor(private readonly providerFactory: AIProviderFactory) {}

  async generateSummary(
    emailContent: EmailContent,
    options: SummarizeEmailDto,
    providerOverride?: AIProvider,
  ): Promise<string> {
    try {
      // Get the appropriate provider (use override if specified, otherwise use default)
      const provider = this.providerFactory.getProvider(providerOverride);

      this.logger.debug(
        `Generating summary using ${provider.getProviderName()} (${provider.getModel()})`,
      );

      // Generate summary using the selected provider
      const summary = await provider.generateSummary(emailContent, options);

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
      default: this.providerFactory.getDefaultProviderName(),
      available: this.providerFactory.getAvailableProviders(),
    };
  }
}
