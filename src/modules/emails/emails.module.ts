import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { EmailsController } from './emails.controller';
import { EmailsService } from './emails.service';
import { SnoozeService } from './snooze.service';
import { SummaryService } from './summary.service';
import { GmailService } from './gmail.service';
import { ImapService } from './imap.service';
import { SmtpService } from './smtp.service';
import { SmtpConfigService } from './smtp-config.service';
import { KanbanService } from './kanban.service';
import { EmailProviderFactory } from './providers/email-provider.factory';
import { AIProviderFactory } from './providers/ai-provider.factory';
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
    EmailProviderFactory,
    AIProviderFactory,
  ],
  exports: [GmailService, ImapService, SmtpService, SnoozeService, SummaryService, KanbanService, AIProviderFactory, EmailProviderFactory],
})
export class EmailsModule {}
