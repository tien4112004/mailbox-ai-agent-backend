import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { KanbanService } from '../../modules/emails/kanban.service';

@Injectable()
export class KanbanSchedulerService {
  private readonly logger = new Logger(KanbanSchedulerService.name);

  constructor(private kanbanService: KanbanService) {}

  @Cron('0 2 */3 * *')
  async cleanupOldCards() {
    try {
      this.logger.log('Starting Kanban cleanup job - removing cards older than 3 days');
      const removedCount = await this.kanbanService.cleanupOldCards();
      this.logger.log(`Kanban cleanup completed: Removed ${removedCount} old cards`);
    } catch (error) {
      this.logger.error('Error in Kanban cleanup scheduler:', error);
    }
  }
}
