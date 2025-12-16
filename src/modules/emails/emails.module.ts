import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { EmailsController } from './emails.controller';
import { EmailsService, SnoozeService, SummaryService, GmailService, KanbanService, KanbanFilterSortService, EmailSearchService } from './services';
import { AIProviderFactory } from './providers/ai-provider.factory';
import { AuthModule } from '../auth/auth.module';
import { Snooze } from '../../database/entities/snooze.entity';
import { KanbanColumn } from '../../database/entities/kanban-column.entity';
import { KanbanCard } from '../../database/entities/kanban-card.entity';
import { Email } from '../../database/entities/email.entity';

@Module({
  imports: [
    forwardRef(() => AuthModule),
    ConfigModule,
    TypeOrmModule.forFeature([Snooze, KanbanColumn, KanbanCard, Email]),
  ],
  controllers: [EmailsController],
  providers: [
    EmailsService,
    SnoozeService,
    GmailService,
    SummaryService,
    KanbanService,
    KanbanFilterSortService,
    EmailSearchService,
    AIProviderFactory,
  ],
  exports: [EmailsService, GmailService, SnoozeService, SummaryService, KanbanService, KanbanFilterSortService, EmailSearchService, AIProviderFactory],
})
export class EmailsModule {}
