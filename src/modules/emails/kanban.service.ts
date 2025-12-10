import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KanbanColumn } from '../../database/entities/kanban-column.entity';
import { KanbanCard } from '../../database/entities/kanban-card.entity';
import { Email } from '../../database/entities/email.entity';
import { CreateKanbanColumnDto } from './dto/create-kanban-column.dto';
import { MoveCardDto } from './dto/move-card.dto';

@Injectable()
export class KanbanService {
  constructor(
    @InjectRepository(KanbanColumn)
    private kanbanColumnRepository: Repository<KanbanColumn>,
    @InjectRepository(KanbanCard)
    private kanbanCardRepository: Repository<KanbanCard>,
    @InjectRepository(Email)
    private emailRepository: Repository<Email>,
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
      { name: 'Snoozed', order: 4, status: 'snoozed', color: '#6B7280' },
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
   */
  async getKanbanBoard(userId: string) {
    const columns = await this.kanbanColumnRepository.find({
      where: { userId, isActive: true },
      order: { order: 'ASC' },
      relations: ['cards', 'cards.email'],
    });

    if (columns.length === 0) {
      // Initialize default board if none exists
      return this.initializeKanbanBoard(userId);
    }

    return columns.map((col) => ({
      id: col.id,
      name: col.name,
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
                  body: card.email.body,
                  preview: card.email.preview,
                  fromName: card.email.fromName,
                  fromEmail: card.email.fromEmail,
                  toEmail: card.email.toEmail,
                  read: card.email.read,
                  starred: card.email.starred,
                  summary: (card.email as any).summary,
                  folder: card.email.folder,
                }
              : null,
          }))
        : [],
    }));
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

    await this.kanbanColumnRepository.remove(column);
  }

  /**
   * Move a card to a different column (Drag and Drop)
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

    // Find existing card or create new one
    let card = await this.kanbanCardRepository.findOne({
      where: { emailId, columnId: fromColumnId },
    });

    if (!card) {
      // Create new card if it doesn't exist
      card = this.kanbanCardRepository.create({
        emailId,
        columnId: toColumnId,
        order: order || 0,
      });
    } else {
      // Update existing card
      card.columnId = toColumnId;
      if (order !== undefined) {
        card.order = order;
      }
    }

    return this.kanbanCardRepository.save(card);
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
