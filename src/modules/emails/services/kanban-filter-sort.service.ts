import { Injectable, Logger } from '@nestjs/common';
import { KanbanCard } from '../../../database/entities/kanban-card.entity';
import { Email } from '../../../database/entities/email.entity';
import { SortBy, FilterType } from '../dto/kanban-filter-sort.dto';

@Injectable()
export class KanbanFilterSortService {
  private readonly logger = new Logger(KanbanFilterSortService.name);

  /**
   * Apply filters to cards
   */
  applyFilters(
    cards: (KanbanCard & { email?: Email })[],
    filters: FilterType[],
  ): (KanbanCard & { email?: Email })[] {
    if (!filters || filters.length === 0) {
      return cards;
    }

    return cards.filter((card) => {
      if (!card.email) return false;

      return filters.every((filter) => {
        switch (filter) {
          case FilterType.UNREAD:
            return card.email.read === false;
          case FilterType.HAS_ATTACHMENTS:
            return card.email.attachments && card.email.attachments.length > 0;
          case FilterType.STARRED:
            return card.email.starred === true;
          default:
            return true;
        }
      });
    });
  }

  /**
   * Sort cards by specified criteria
   */
  sortCards(
    cards: (KanbanCard & { email?: Email })[],
    sortBy: SortBy,
  ): (KanbanCard & { email?: Email })[] {
    const sortedCards = [...cards]; // Create a copy to avoid mutating original

    switch (sortBy) {
      case SortBy.DATE_NEWEST:
        return sortedCards.sort((a, b) => {
          const dateA = a.email?.createdAt ? new Date(a.email.createdAt).getTime() : 0;
          const dateB = b.email?.createdAt ? new Date(b.email.createdAt).getTime() : 0;
          return dateB - dateA; // Newest first
        });

      case SortBy.DATE_OLDEST:
        return sortedCards.sort((a, b) => {
          const dateA = a.email?.createdAt ? new Date(a.email.createdAt).getTime() : 0;
          const dateB = b.email?.createdAt ? new Date(b.email.createdAt).getTime() : 0;
          return dateA - dateB; // Oldest first
        });

      case SortBy.SENDER_NAME:
        return sortedCards.sort((a, b) => {
          const senderA = a.email?.fromName || a.email?.fromEmail || '';
          const senderB = b.email?.fromName || b.email?.fromEmail || '';
          return senderA.localeCompare(senderB); // Alphabetical
        });

      case SortBy.RELEVANCE:
        // Default: maintain original order (as determined by user or database)
        return sortedCards;

      default:
        return sortedCards;
    }
  }

  /**
   * Apply both filtering and sorting to cards
   * Filtering happens first, then sorting on filtered results
   */
  applyFilterAndSort(
    cards: (KanbanCard & { email?: Email })[],
    sortBy: SortBy,
    filters: FilterType[],
  ): (KanbanCard & { email?: Email })[] {
    // First filter
    const filteredCards = this.applyFilters(cards, filters);

    // Then sort
    return this.sortCards(filteredCards, sortBy);
  }
}
