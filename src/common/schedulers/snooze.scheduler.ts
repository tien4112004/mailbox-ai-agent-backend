import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SnoozeService } from '../../modules/emails/snooze.service';

@Injectable()
export class SnoozeSchedulerService {
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
        console.log(
          `Resumed ${resumedSnoozes.length} snoozed emails at ${new Date().toISOString()}`,
        );
      }
    } catch (error) {
      console.error(
        'Error in snooze scheduler:',
        error,
      );
    }
  }
}
