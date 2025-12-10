import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { Snooze, SnoozeStatus } from '../database/entities/snooze.entity';
import { SnoozeEmailDto } from './dto/snooze-email.dto';
import { GmailService } from './gmail.service';
import { AuthService } from '../auth/auth.service';
import { addDays, addWeeks, addMonths, isPast } from 'date-fns';

@Injectable()
export class SnoozeService {
  constructor(
    @InjectRepository(Snooze)
    private snoozeRepository: Repository<Snooze>,
    private gmailService: GmailService,
    private authService: AuthService,
  ) {}

  /**
   * Snooze an email until a specified time
   * The email will be moved to a special label and hidden from the inbox
   */
  async snoozeEmail(
    userId: string,
    emailId: string,
    gmailMessageId: string,
    dto: SnoozeEmailDto,
  ): Promise<Snooze> {
    // Validate snooze time is in the future
    const snoozeDate = new Date(dto.snoozeUntil);
    if (isPast(snoozeDate)) {
      throw new BadRequestException(
        'Snooze time must be in the future',
      );
    }

    const tokens = await this.authService.getGmailTokens(userId);

    // Get the current email to preserve its labels
    const email = await this.gmailService.getEmailById(
      tokens.accessToken,
      tokens.refreshToken,
      gmailMessageId,
    );

    const originalLabels = email.labelIds || [];

    // Remove from inbox and archive (move to a snoozed state)
    const labelsToRemove = ['INBOX', 'UNREAD'];
    const labelsToAdd = ['SNOOZED']; // Custom label for snoozed emails

    await this.gmailService.modifyEmail(
      tokens.accessToken,
      tokens.refreshToken,
      gmailMessageId,
      labelsToAdd,
      labelsToRemove,
    );

    // Create snooze record
    const snooze = this.snoozeRepository.create({
      emailId,
      gmailMessageId,
      userId,
      status: SnoozeStatus.SNOOZED,
      snoozeUntil: snoozeDate,
      originalLabels: originalLabels.filter(
        (label) => label !== 'INBOX' && label !== 'UNREAD',
      ),
      originalFolder: 'INBOX',
      snoozeReason: dto.snoozeReason,
      isRecurring: dto.isRecurring || false,
      recurrencePattern: dto.recurrencePattern,
    });

    return this.snoozeRepository.save(snooze);
  }

  /**
   * Resume a snoozed email (bring it back to inbox)
   */
  async resumeSnooze(userId: string, snoozeId: string): Promise<Snooze> {
    const snooze = await this.snoozeRepository.findOne({
      where: { id: snoozeId, userId },
    });

    if (!snooze) {
      throw new NotFoundException('Snooze record not found');
    }

    if (snooze.status !== SnoozeStatus.SNOOZED) {
      throw new BadRequestException(
        `Cannot resume snooze with status: ${snooze.status}`,
      );
    }

    const tokens = await this.authService.getGmailTokens(userId);

    // Restore original labels
    const labelsToAdd = ['INBOX', ...snooze.originalLabels];
    const labelsToRemove = ['SNOOZED'];

    await this.gmailService.modifyEmail(
      tokens.accessToken,
      tokens.refreshToken,
      snooze.gmailMessageId,
      labelsToAdd,
      labelsToRemove,
    );

    // Update snooze status
    snooze.status = SnoozeStatus.RESUMED;
    snooze.resumedAt = new Date();

    // Handle recurring snoozes
    if (snooze.isRecurring && snooze.recurrencePattern) {
      const nextSnoozeDate = this.calculateNextSnoozeDate(
        snooze.snoozeUntil,
        snooze.recurrencePattern,
      );

      // Create a new snooze for the next occurrence
      const nextSnooze = this.snoozeRepository.create({
        emailId: snooze.emailId,
        gmailMessageId: snooze.gmailMessageId,
        userId: snooze.userId,
        status: SnoozeStatus.SNOOZED,
        snoozeUntil: nextSnoozeDate,
        originalLabels: snooze.originalLabels,
        originalFolder: snooze.originalFolder,
        snoozeReason: snooze.snoozeReason,
        isRecurring: true,
        recurrencePattern: snooze.recurrencePattern,
      });

      await this.snoozeRepository.save(nextSnooze);
      
      // Move back to snoozed state for the next occurrence
      await this.gmailService.modifyEmail(
        tokens.accessToken,
        tokens.refreshToken,
        snooze.gmailMessageId,
        ['SNOOZED'],
        ['INBOX', 'UNREAD', ...snooze.originalLabels],
      );
    }

    return this.snoozeRepository.save(snooze);
  }

  /**
   * Cancel a snooze
   */
  async cancelSnooze(userId: string, snoozeId: string): Promise<Snooze> {
    const snooze = await this.snoozeRepository.findOne({
      where: { id: snoozeId, userId },
    });

    if (!snooze) {
      throw new NotFoundException('Snooze record not found');
    }

    if (snooze.status !== SnoozeStatus.SNOOZED) {
      throw new BadRequestException(
        `Cannot cancel snooze with status: ${snooze.status}`,
      );
    }

    const tokens = await this.authService.getGmailTokens(userId);

    // Restore original labels
    const labelsToAdd = ['INBOX', ...snooze.originalLabels];
    const labelsToRemove = ['SNOOZED'];

    await this.gmailService.modifyEmail(
      tokens.accessToken,
      tokens.refreshToken,
      snooze.gmailMessageId,
      labelsToAdd,
      labelsToRemove,
    );

    // Update snooze status
    snooze.status = SnoozeStatus.CANCELLED;
    snooze.cancelledAt = new Date();

    return this.snoozeRepository.save(snooze);
  }

  /**
   * Get all snoozed emails for a user
   */
  async getSnoozedEmails(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ) {
    const skip = (page - 1) * limit;

    const [snoozes, total] = await this.snoozeRepository.findAndCount({
      where: { userId, status: SnoozeStatus.SNOOZED },
      order: { snoozeUntil: 'ASC' },
      skip,
      take: limit,
    });

    return {
      snoozes,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get snooze history for a user
   */
  async getSnoozeHistory(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ) {
    const skip = (page - 1) * limit;

    const [snoozes, total] = await this.snoozeRepository.findAndCount({
      where: { userId },
      order: { updatedAt: 'DESC' },
      skip,
      take: limit,
    });

    return {
      snoozes,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get details of a specific snooze
   */
  async getSnoozeDetails(userId: string, snoozeId: string): Promise<Snooze> {
    const snooze = await this.snoozeRepository.findOne({
      where: { id: snoozeId, userId },
    });

    if (!snooze) {
      throw new NotFoundException('Snooze record not found');
    }

    return snooze;
  }

  /**
   * Check and resume all due snoozed emails
   * This should be called periodically by a scheduled task
   */
  async resumeDueSnoozedEmails(): Promise<Snooze[]> {
    const now = new Date();

    const dueSnoozes = await this.snoozeRepository.find({
      where: {
        status: SnoozeStatus.SNOOZED,
        snoozeUntil: LessThanOrEqual(now),
      },
    });

    const resumedSnoozes: Snooze[] = [];

    for (const snooze of dueSnoozes) {
      try {
        const resumed = await this.resumeSnooze(snooze.userId, snooze.id);
        resumedSnoozes.push(resumed);
      } catch (error) {
        console.error(
          `Failed to resume snooze ${snooze.id} for user ${snooze.userId}:`,
          error,
        );
      }
    }

    return resumedSnoozes;
  }

  /**
   * Update snooze time for an existing snooze
   */
  async updateSnoozeTime(
    userId: string,
    snoozeId: string,
    newSnoozeUntil: string,
  ): Promise<Snooze> {
    const snooze = await this.snoozeRepository.findOne({
      where: { id: snoozeId, userId },
    });

    if (!snooze) {
      throw new NotFoundException('Snooze record not found');
    }

    if (snooze.status !== SnoozeStatus.SNOOZED) {
      throw new BadRequestException(
        `Cannot update snooze with status: ${snooze.status}`,
      );
    }

    const newDate = new Date(newSnoozeUntil);
    if (isPast(newDate)) {
      throw new BadRequestException(
        'New snooze time must be in the future',
      );
    }

    snooze.snoozeUntil = newDate;
    return this.snoozeRepository.save(snooze);
  }

  /**
   * Calculate next snooze date based on recurrence pattern
   */
  private calculateNextSnoozeDate(
    currentDate: Date,
    pattern: string,
  ): Date {
    switch (pattern) {
      case 'DAILY':
        return addDays(currentDate, 1);
      case 'WEEKLY':
        return addWeeks(currentDate, 1);
      case 'MONTHLY':
        return addMonths(currentDate, 1);
      default:
        return currentDate;
    }
  }

  /**
   * Get upcoming snoozed emails (within next N days)
   */
  async getUpcomingSnoozed(
    userId: string,
    daysAhead: number = 7,
  ): Promise<Snooze[]> {
    const now = new Date();
    const futureDate = addDays(now, daysAhead);

    return this.snoozeRepository.find({
      where: {
        userId,
        status: SnoozeStatus.SNOOZED,
        snoozeUntil: LessThanOrEqual(futureDate),
      },
      order: { snoozeUntil: 'ASC' },
    });
  }

  /**
   * Count total snoozed emails for a user
   */
  async countSnoozes(userId: string): Promise<number> {
    return this.snoozeRepository.count({
      where: { userId, status: SnoozeStatus.SNOOZED },
    });
  }
}
