import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { EmailsController } from './emails.controller';
import { EmailsService } from './emails.service';
import { SnoozeService } from './snooze.service';
import { SummaryService } from './summary.service';
import { GmailService } from './gmail.service';
import { AIProviderFactory } from './providers/ai-provider.factory';
import { AuthModule } from '../auth/auth.module';
import { Snooze } from '../../database/entities/snooze.entity';

@Module({
  imports: [forwardRef(() => AuthModule), ConfigModule, TypeOrmModule.forFeature([Snooze])],
  controllers: [EmailsController],
  providers: [
    EmailsService,
    SnoozeService,
    GmailService,
    SummaryService,
    AIProviderFactory,
  ],
  exports: [GmailService, SnoozeService, SummaryService, AIProviderFactory],
})
export class EmailsModule {}
