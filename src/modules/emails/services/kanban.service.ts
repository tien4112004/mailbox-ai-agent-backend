import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, In } from 'typeorm';
import { KanbanColumn } from '../../../database/entities/kanban-column.entity';
import { KanbanCard } from '../../../database/entities/kanban-card.entity';
import { Email } from '../../../database/entities/email.entity';
import { CreateKanbanColumnDto } from '../dto/create-kanban-column.dto';
import { MoveCardDto } from '../dto/move-card.dto';
import { GmailService } from './gmail.service';
import { AuthService } from '../../auth/auth.service';

@Injectable()
export class KanbanService {
  private readonly logger = new Logger(KanbanService.name);

  constructor(
    @InjectRepository(KanbanColumn)
    private kanbanColumnRepository: Repository<KanbanColumn>,
    @InjectRepository(KanbanCard)
    private kanbanCardRepository: Repository<KanbanCard>,
    @InjectRepository(Email)
    private emailRepository: Repository<Email>,
    private gmailService: GmailService, // Inject GmailService
    private authService: AuthService,   // Inject AuthService
  ) {}

  /**
   * Initialize default Kanban columns for a user
   */
  async initializeKanbanBoard(userId: string): Promise<KanbanColumn[]> {
    const existingColumns = await this.kanbanColumnRepository.find({
      where: { userId },
    });

    if (existingColumns.length > 0) {
      return existingColumns;
    }

    const defaultColumns = [
      { name: 'Inbox', order: 0, status: 'inbox', color: '#3B82F6' },
      { name: 'To Do', order: 1, status: 'todo', color: '#F59E0B' },
      { name: 'In Progress', order: 2, status: 'in-progress', color: '#8B5CF6' },
      { name: 'Done', order: 3, status: 'done', color: '#10B981' },
    ];

    const columns = this.kanbanColumnRepository.create(
      defaultColumns.map((col) => ({
        ...col,
        userId,
        isActive: true,
      })),
    );

    return this.kanbanColumnRepository.save(columns);
  }

  /**
   * Get all Kanban columns for a user with their cards
   * Optimized: Single database query with eager loading
   */
  async getKanbanBoard(userId: string) {
    // Check if board exists and initialize if needed (non-blocking)
    const existingColumns = await this.kanbanColumnRepository.find({
      where: { userId, isActive: true },
    });

    if (existingColumns.length === 0) {
      // Initialize default board
      await this.initializeKanbanBoard(userId);
    }

    // Single optimized query with proper relations and ordering
    const columns = await this.kanbanColumnRepository.find({
      where: { userId, isActive: true },
      order: { order: 'ASC' },
      relations: ['cards', 'cards.email'],
    });

    // Auto-sync emails from last 3 days to Inbox column asynchronously
    // This doesn't block the response
    this.autoSyncRecentEmails(userId, columns).catch((error) => {
      this.logger.error(`Error auto-syncing emails in background: ${error.message}`);
    });

    // Map and return data immediately
    return columns.map((col) => ({
      id: col.id,
      name: col.name,
      labelId: col.labelId,
      order: col.order,
      status: col.status,
      color: col.color,
      cards: col.cards
        ? col.cards.map((card) => ({
            id: card.id,
            emailId: card.emailId,
            columnId: card.columnId,
            order: card.order,
            notes: card.notes,
            email: card.email
              ? {
                  id: card.email.id,
                  subject: card.email.subject,
                  preview: card.email.preview,
                  fromName: card.email.fromName,
                  fromEmail: card.email.fromEmail,
                  read: card.email.read,
                  starred: card.email.starred,
                }
              : null,
          }))
        : [],
    }));
  }

  /**
   * Auto-sync emails from last 3 days to Inbox column
   * Only adds emails that don't already have cards in ANY column
   * Enforces single-column-per-email rule
   * Optimized: Database-level filtering instead of JavaScript
   */
  private async autoSyncRecentEmails(userId: string, columns: KanbanColumn[]): Promise<void> {
    try {
      // Find Inbox column
      const inboxColumn = columns.find((col) => col.status === 'inbox');
      if (!inboxColumn) {
        return;
      }

      // Get emails from last 3 days using database query
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      // Get recent emails that don't have cards in ANY column using a single optimized query
      const recentEmailsWithoutCards = await this.emailRepository
        .createQueryBuilder('email')
        .leftJoin(
          KanbanCard,
          'card',
          'card.emailId = email.id' // Check ANY column, not just inbox
        )
        .where('email.userId = :userId', { userId })
        .andWhere('email.folder = :folder', { folder: 'INBOX' })
        .andWhere('email.createdAt >= :threeDaysAgo', { threeDaysAgo })
        .andWhere('card.id IS NULL') // Only emails without cards in any column
        .orderBy('email.createdAt', 'DESC')
        .select('email.id')
        .getMany();

      if (recentEmailsWithoutCards.length === 0) {
        return;
      }

      // Create cards in bulk with conflict handling
      const newCards = recentEmailsWithoutCards.map((email, index) =>
        this.kanbanCardRepository.create({
          emailId: email.id,
          columnId: inboxColumn.id,
          order: index,
          notes: null,
        }),
      );

      // Save with ON CONFLICT handling to prevent duplicates
      await this.kanbanCardRepository
        .createQueryBuilder()
        .insert()
        .into(KanbanCard)
        .values(newCards)
        .orIgnore()
        .execute()
        .catch((error) => {
          // Log but don't fail if insert fails
          this.logger.debug(`Some cards already exist: ${error.message}`);
        });

      this.logger.debug(
        `Auto-synced ${newCards.length} emails to Inbox for user ${userId}`,
      );
    } catch (error) {
      this.logger.error(`Error auto-syncing recent emails: ${error.message}`);
      // Don't throw - let the board load even if sync fails
    }
  }

  /**
   * Sync emails from last 3 days to Kanban board Inbox column
   * Called when user logs in via Gmail to populate the board with existing emails
   * Enforces single-column-per-email rule: checks ALL columns, not just Inbox
   */
  async syncEmailsToBoard(userId: string): Promise<number> {
    try {
      // Get or initialize Kanban board
      const columns = await this.kanbanColumnRepository.find({
        where: { userId, isActive: true },
      });

      if (columns.length === 0) {
        this.logger.warn(
          `Kanban board not initialized for user ${userId}. Initialize board first.`,
        );
        return 0;
      }

      // Find Inbox column
      const inboxColumn = columns.find((col) => col.status === 'inbox');
      if (!inboxColumn) {
        this.logger.warn(`Inbox column not found for user ${userId}`);
        return 0;
      }

      // Get emails from last 3 days
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      const recentEmails = await this.emailRepository.find({
        where: {
          userId,
          folder: 'INBOX',
          createdAt: LessThan(new Date()),
        },
        order: { createdAt: 'DESC' },
      });

      // Filter to only emails from last 3 days
      const emailsFromLast3Days = recentEmails.filter(
        (email) => new Date(email.createdAt) >= threeDaysAgo,
      );

      // Get existing cards in ANY column (not just Inbox) to prevent duplicates
      const existingCards = await this.kanbanCardRepository.find({
        where: { emailId: In(emailsFromLast3Days.map((e) => e.id)) },
      });
      const existingEmailIds = new Set(existingCards.map((card) => card.emailId));

      // Create cards for emails that don't already have cards in ANY column
      const newCards = emailsFromLast3Days
        .filter((email) => !existingEmailIds.has(email.id))
        .map((email, index) =>
          this.kanbanCardRepository.create({
            emailId: email.id,
            columnId: inboxColumn.id,
            order: index,
            notes: null,
          }),
        );

      if (newCards.length > 0) {
        await this.kanbanCardRepository.save(newCards);
        this.logger.log(
          `Synced ${newCards.length} recent emails to Inbox board for user ${userId}`,
        );
      }

      return newCards.length;
    } catch (error) {
      this.logger.error(`Error syncing emails to board: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Remove cards for emails older than 3 days
   * Should be called by cron job periodically
   */
  async cleanupOldCards(userId?: string): Promise<number> {
    try {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      // Find cards with emails older than 3 days
      const cardsToRemove = await this.kanbanCardRepository
        .createQueryBuilder('card')
        .leftJoinAndSelect('card.email', 'email')
        .where('email.createdAt < :threeDaysAgo', { threeDaysAgo })
        .andWhere(userId ? 'card.columnId IN (SELECT id FROM kanban_columns WHERE userId = :userId)' : '1=1', { userId })
        .getMany();

      if (cardsToRemove.length > 0) {
        await this.kanbanCardRepository.remove(cardsToRemove);
        this.logger.log(
          `Cleaned up ${cardsToRemove.length} old cards${userId ? ` for user ${userId}` : ''}`,
        );
      }

      return cardsToRemove.length;
    } catch (error) {
      this.logger.error(`Error cleaning up old cards: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Create a new Kanban column
   */
  async createColumn(
    userId: string,
    createKanbanColumnDto: CreateKanbanColumnDto,
  ): Promise<KanbanColumn> {
    const column = this.kanbanColumnRepository.create({
      ...createKanbanColumnDto,
      userId,
      isActive: true,
    });
    return this.kanbanColumnRepository.save(column);
  }

  /**
   * Update a Kanban column
   */
  async updateColumn(
    userId: string,
    columnId: string,
    updateData: Partial<CreateKanbanColumnDto>,
  ): Promise<KanbanColumn> {
    const column = await this.kanbanColumnRepository.findOne({
      where: { id: columnId, userId },
    });

    if (!column) {
      throw new NotFoundException('Kanban column not found');
    }

    // Inbox column is immutable
    if (column.status === 'inbox') {
      throw new BadRequestException('Inbox column cannot be modified');
    }

    // If column is renamed, move all cards to inbox as per requirements
    if (updateData.name && updateData.name !== column.name) {
      await this.moveAllCardsToInbox(userId, columnId);
    }

    Object.assign(column, updateData);
    return this.kanbanColumnRepository.save(column);
  }

  /**
   * Delete a Kanban column
   */
  async deleteColumn(userId: string, columnId: string): Promise<void> {
    const column = await this.kanbanColumnRepository.findOne({
      where: { id: columnId, userId },
    });

    if (!column) {
      throw new NotFoundException('Kanban column not found');
    }

    // Prevent deleting inbox
    if (column.status === 'inbox') {
      throw new BadRequestException('Inbox column cannot be deleted');
    }

    // Move cards to inbox before deleting
    await this.moveAllCardsToInbox(userId, columnId);

    await this.kanbanColumnRepository.remove(column);
  }

  /**
   * Move a card to a different column (Drag and Drop)
   * Enforces single-column-per-email rule: removes email from other columns
   */
  async moveCard(userId: string, moveCardDto: MoveCardDto): Promise<KanbanCard> {
    const { emailId, fromColumnId, toColumnId, order } = moveCardDto;

    // Verify both columns belong to the user
    const fromColumn = await this.kanbanColumnRepository.findOne({
      where: { id: fromColumnId, userId },
    });
    const toColumn = await this.kanbanColumnRepository.findOne({
      where: { id: toColumnId, userId },
    });

    if (!fromColumn || !toColumn) {
      throw new BadRequestException('Invalid column ID');
    }

    // Check if email exists
    const email = await this.emailRepository.findOne({
      where: { id: emailId, userId },
    });

    if (!email) {
      throw new NotFoundException('Email not found');
    }

    // Delete all existing cards for this email (enforce single-column rule)
    await this.kanbanCardRepository.delete({ emailId });

    // Create new card in target column
    const card = this.kanbanCardRepository.create({
      emailId,
      columnId: toColumnId,
      order: order || 0,
    });

    const saved = await this.kanbanCardRepository.save(card);

    // Apply label changes in Gmail if necessary (don't block operation on failure)
    try {
      const emailEntity = await this.emailRepository.findOne({ where: { id: emailId } });
      await this.applyLabelOnMove(userId, emailEntity, fromColumn, toColumn);
    } catch (err) {
      this.logger.error('Failed to apply label changes on move:', err?.message || err);
    }

    return saved;
  }

  /**
   * Move all cards from a source column to the user's Inbox column
   */
  private async moveAllCardsToInbox(userId: string, sourceColumnId: string): Promise<void> {
    // Ensure inbox column exists
    let inboxColumn = await this.kanbanColumnRepository.findOne({ where: { userId, status: 'inbox' } });
    if (!inboxColumn) {
      const cols = await this.kanbanColumnRepository.find({ where: { userId } });
      if (cols.length === 0) {
        await this.initializeKanbanBoard(userId);
      }
      inboxColumn = await this.kanbanColumnRepository.findOne({ where: { userId, status: 'inbox' } });
      if (!inboxColumn) throw new Error('Inbox column not found');
    }

    const cards = await this.kanbanCardRepository.find({ where: { columnId: sourceColumnId } });
    if (cards.length === 0) return;

    for (const card of cards) {
      // Remove existing cards for that email to enforce single-column rule
      await this.kanbanCardRepository.delete({ emailId: card.emailId });

      // Create card in inbox
      const newCard = this.kanbanCardRepository.create({ emailId: card.emailId, columnId: inboxColumn.id, order: 0 });
      await this.kanbanCardRepository.save(newCard);

      // Update Gmail labels: remove source column label and add INBOX
      try {
        const emailEntity = await this.emailRepository.findOne({ where: { id: card.emailId } });
        const sourceColumn = await this.kanbanColumnRepository.findOne({ where: { id: sourceColumnId } });
        await this.applyLabelOnMove(userId, emailEntity, sourceColumn, inboxColumn);
      } catch (err) {
        this.logger.error('Failed to update labels while moving cards to inbox:', err?.message || err);
      }
    }
  }

  private isDbEmail(messageId: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(messageId);
  }

  private async applyLabelOnMove(userId: string, emailEntity: Email, fromColumn: KanbanColumn | null, toColumn: KanbanColumn | null) {
    if (!emailEntity || !emailEntity.messageId) return;

    // Only apply labels for Gmail messages (non-DB IDs)
    if (this.isDbEmail(emailEntity.messageId)) return;

    const tokens = await this.authService.getGmailTokens(userId);

    const addLabelIds: string[] = [];
    const removeLabelIds: string[] = [];

    if (fromColumn) {
      if (fromColumn.labelId) removeLabelIds.push(fromColumn.labelId);
      if (fromColumn.status === 'inbox') removeLabelIds.push('INBOX');
    }

    if (toColumn) {
      if (toColumn.labelId) addLabelIds.push(toColumn.labelId);
      if (toColumn.status === 'inbox') addLabelIds.push('INBOX');
    }

    // If moving to a non-inbox column, ensure INBOX is removed
    if (toColumn && toColumn.status !== 'inbox') {
      removeLabelIds.push('INBOX');
    }

    // Call Gmail modify; catch errors but don't fail operation
    try {
      await this.gmailService.modifyEmail(tokens.accessToken, tokens.refreshToken, emailEntity.messageId, addLabelIds.length ? addLabelIds : undefined, removeLabelIds.length ? removeLabelIds : undefined);
    } catch (err) {
      this.logger.error('Error modifying Gmail labels:', err?.message || err);
    }
  }
  /**
   * Add an email to a specific Kanban column
   */
  async addCardToColumn(
    userId: string,
    emailId: string,
    columnId: string,
    order: number = 0,
  ): Promise<KanbanCard> {
    // Verify column belongs to user
    const column = await this.kanbanColumnRepository.findOne({
      where: { id: columnId, userId },
    });

    if (!column) {
      throw new BadRequestException('Invalid column ID');
    }

    // Check if email exists
    const email = await this.emailRepository.findOne({
      where: { id: emailId, userId },
    });

    if (!email) {
      throw new NotFoundException('Email not found');
    }

    // Check if card already exists
    let card = await this.kanbanCardRepository.findOne({
      where: { emailId, columnId },
    });

    if (card) {
      return card;
    }

    // Create new card
    card = this.kanbanCardRepository.create({
      emailId,
      columnId,
      order,
    });

    return this.kanbanCardRepository.save(card);
  }

  /**
   * Remove a card from Kanban board
   */
  async removeCard(userId: string, cardId: string): Promise<void> {
    const card = await this.kanbanCardRepository.findOne({
      where: { id: cardId },
      relations: ['column'],
    });

    if (!card || card.column.userId !== userId) {
      throw new NotFoundException('Card not found');
    }

    await this.kanbanCardRepository.remove(card);
  }

  /**
   * Update card notes
   */
  async updateCardNotes(
    userId: string,
    cardId: string,
    notes: string,
  ): Promise<KanbanCard> {
    const card = await this.kanbanCardRepository.findOne({
      where: { id: cardId },
      relations: ['column'],
    });

    if (!card || card.column.userId !== userId) {
      throw new NotFoundException('Card not found');
    }

    card.notes = notes;
    return this.kanbanCardRepository.save(card);
  }

  /**
   * Get cards for a specific column
   */
  async getColumnCards(
    userId: string,
    columnId: string,
  ): Promise<KanbanCard[]> {
    const column = await this.kanbanColumnRepository.findOne({
      where: { id: columnId, userId },
    });

    if (!column) {
      throw new NotFoundException('Column not found');
    }

    return this.kanbanCardRepository.find({
      where: { columnId },
      relations: ['email'],
      order: { order: 'ASC' },
    });
  }

  /**
   * Reorder cards within a column
   */
  async reorderCards(
    userId: string,
    columnId: string,
    cardIds: string[],
  ): Promise<KanbanCard[]> {
    const column = await this.kanbanColumnRepository.findOne({
      where: { id: columnId, userId },
    });

    if (!column) {
      throw new NotFoundException('Column not found');
    }

    const cards = await this.kanbanCardRepository.find({
      where: { columnId },
    });

    // Update order for each card
    const updatedCards = cards.map((card) => {
      const newOrder = cardIds.indexOf(card.id);
      if (newOrder !== -1) {
        card.order = newOrder;
      }
      return card;
    });

    return this.kanbanCardRepository.save(updatedCards);
  }
}
