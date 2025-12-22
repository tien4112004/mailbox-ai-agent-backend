import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SnoozeService } from '../../modules/emails/services/snooze.service';

@Injectable()
export class SnoozeSchedulerService {
  private readonly logger = new Logger(SnoozeSchedulerService.name);
  constructor(private snoozeService: SnoozeService) {}

  /**
   * Check every minute for due snoozed emails and resume them
   */
  @Cron('* * * * *')
  async handleDueSnoozedEmails() {
    try {
      const resumedSnoozes =
        await this.snoozeService.resumeDueSnoozedEmails();
      if (resumedSnoozes.length > 0) {
        this.logger.log(
          `Resumed ${resumedSnoozes.length} snoozed emails at ${new Date().toISOString()}`,
        );
      }
    } catch (error) {
      this.logger.error('Error in snooze scheduler:', error?.stack || error);
    }
  }
}
