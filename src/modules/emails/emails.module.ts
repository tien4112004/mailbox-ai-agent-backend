import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { EmailsController } from './emails.controller';
import { EmailsService, SnoozeService, SummaryService, GmailService, KanbanService, KanbanFilterSortService, EmailSearchService } from './services';
import { SearchQueryParser } from './services/search-query-parser.service';
import { ImapService } from './imap.service';
import { SmtpService } from './smtp.service';
import { SmtpConfigService } from './smtp-config.service';
import { EmailProviderFactory } from './providers/email-provider.factory';
import { GeminiAdapter } from './providers/gemini.adapter';
import { ConfigService } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { Snooze } from '../../database/entities/snooze.entity';
import { KanbanColumn } from '../../database/entities/kanban-column.entity';
import { KanbanCard } from '../../database/entities/kanban-card.entity';
import { Email } from '../../database/entities/email.entity';
import { SmtpConfig } from '../../database/entities/smtp-config.entity';
import { User } from '../../database/entities/user.entity';

@Module({
  imports: [
    forwardRef(() => AuthModule),
    ConfigModule,
    TypeOrmModule.forFeature([Snooze, KanbanColumn, KanbanCard, Email, SmtpConfig, User]),
  ],
  controllers: [EmailsController],
  providers: [
    EmailsService,
    SnoozeService,
    GmailService,
    ImapService,
    SmtpService,
    SmtpConfigService,
    SummaryService,
    KanbanService,
    KanbanFilterSortService,
    EmailSearchService,
    SearchQueryParser,
    EmailProviderFactory,
    // Provide a single AI summary provider instance (Gemini)
    {
      provide: 'AI_SUMMARY_PROVIDER',
      useFactory: (configService: ConfigService) => {
        const apiKey = configService.get<string>('GEMINI_API_KEY');
        const model = configService.get<string>('GEMINI_MODEL', 'gemini-2.5-flash-lite');
        return new GeminiAdapter({ apiKey, model });
      },
      inject: [ConfigService],
    },
  ],
  exports: [EmailsService, GmailService, ImapService, SmtpService, SnoozeService, SummaryService, KanbanService, KanbanFilterSortService, EmailSearchService, EmailProviderFactory, 'AI_SUMMARY_PROVIDER'],
})
export class EmailsModule { }
