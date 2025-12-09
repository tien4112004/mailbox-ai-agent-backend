import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IAISummaryProvider, AIProvider, AIProviderConfig } from './ai-summary.provider';
import { OpenAIAdapter } from './openai.adapter';
import { GeminiAdapter } from './gemini.adapter';

@Injectable()
export class AIProviderFactory {
  private readonly logger = new Logger(AIProviderFactory.name);
  private readonly providers: Map<AIProvider, IAISummaryProvider> = new Map();

  constructor(private configService: ConfigService) {
    this.initializeProviders();
  }

  private initializeProviders(): void {
    // Initialize OpenAI provider
    const openaiKey = this.configService.get<string>('OPENAI_API_KEY');
    const openaiModel = this.configService.get<string>(
      'OPENAI_MODEL',
      'gpt-3.5-turbo',
    );
    if (openaiKey) {
      this.providers.set(
        AIProvider.OPENAI,
        new OpenAIAdapter({
          apiKey: openaiKey,
          model: openaiModel,
        }),
      );
      this.logger.debug('OpenAI provider initialized');
    }

    // Initialize Gemini provider
    const geminiKey = this.configService.get<string>('GEMINI_API_KEY');
    const geminiModel = this.configService.get<string>(
      'GEMINI_MODEL',
      'gemini-pro',
    );
    if (geminiKey) {
      this.providers.set(
        AIProvider.GEMINI,
        new GeminiAdapter({
          apiKey: geminiKey,
          model: geminiModel,
        }),
      );
      this.logger.debug('Gemini provider initialized');
    }

    if (this.providers.size === 0) {
      this.logger.warn(
        'No AI providers configured. Please set OPENAI_API_KEY or GEMINI_API_KEY',
      );
    }
  }

  getProvider(provider?: AIProvider): IAISummaryProvider {
    // If specific provider requested, use it
    if (provider) {
      const instance = this.providers.get(provider);
      if (!instance) {
        throw new HttpException(
          `${provider} provider is not configured`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      return instance;
    }

    // Otherwise, get default provider
    const defaultProvider = this.configService.get<AIProvider>(
      'SUMMARY_PROVIDER',
      AIProvider.OPENAI,
    );

    const instance = this.providers.get(defaultProvider);
    if (!instance) {
      // Fallback to first available provider
      if (this.providers.size > 0) {
        const fallback = this.providers.values().next().value;
        this.logger.warn(
          `Default provider ${defaultProvider} not configured, falling back to ${fallback.getProviderName()}`,
        );
        return fallback;
      }

      throw new HttpException(
        'No AI provider is configured',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return instance;
  }

  isProviderAvailable(provider: AIProvider): boolean {
    return this.providers.has(provider);
  }

  getAvailableProviders(): string[] {
    return Array.from(this.providers.values()).map((p) =>
      p.getProviderName(),
    );
  }

  getDefaultProviderName(): string {
    const defaultProvider = this.configService.get<AIProvider>(
      'SUMMARY_PROVIDER',
      AIProvider.OPENAI,
    );

    const provider = this.providers.get(defaultProvider);
    if (provider) {
      return provider.getProviderName();
    }

    // Return first available if default not configured
    if (this.providers.size > 0) {
      return this.providers.values().next().value.getProviderName();
    }

    return 'None';
  }
}
