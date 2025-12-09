import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailsController } from './emails.controller';
import { EmailsService } from './emails.service';
import { SnoozeService } from './snooze.service';
import { GmailService } from './gmail.service';
import { AuthModule } from '../auth/auth.module';
import { Snooze } from '../../database/entities/snooze.entity';

@Module({
  imports: [forwardRef(() => AuthModule), TypeOrmModule.forFeature([Snooze])],
  controllers: [EmailsController],
  providers: [EmailsService, SnoozeService, GmailService],
  exports: [GmailService, SnoozeService],
})
export class EmailsModule {}
