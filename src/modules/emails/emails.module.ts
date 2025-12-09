import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { EmailsController } from './emails.controller';
import { EmailsService } from './emails.service';
import { SnoozeService } from './snooze.service';
import { SummaryService } from './summary.service';
import { GmailService } from './gmail.service';
import { AuthModule } from '../auth/auth.module';
import { Snooze } from '../../database/entities/snooze.entity';

@Module({
  imports: [forwardRef(() => AuthModule), ConfigModule, TypeOrmModule.forFeature([Snooze])],
  controllers: [EmailsController],
  providers: [EmailsService, SnoozeService, GmailService, SummaryService],
  exports: [GmailService, SnoozeService, SummaryService],
})
export class EmailsModule {}
