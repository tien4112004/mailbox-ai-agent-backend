import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { EmailsController } from './emails.controller';
import { EmailsService } from './emails.service';
import { SnoozeService } from './snooze.service';
import { SummaryService } from './summary.service';
import { GmailService } from './gmail.service';
import { KanbanService } from './kanban.service';
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
    AIProviderFactory,
  ],
  exports: [EmailsService, GmailService, SnoozeService, SummaryService, KanbanService, AIProviderFactory],
})
export class EmailsModule {}
