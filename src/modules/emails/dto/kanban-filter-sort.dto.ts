import { IsEnum, IsOptional, IsArray } from 'class-validator';

export enum SortBy {
  DATE_NEWEST = 'date_newest',
  DATE_OLDEST = 'date_oldest',
  SENDER_NAME = 'sender_name',
  RELEVANCE = 'relevance',
}

export enum FilterType {
  UNREAD = 'unread',
  HAS_ATTACHMENTS = 'has_attachments',
  STARRED = 'starred',
}

export class KanbanFilterSortDto {
  @IsEnum(SortBy)
  @IsOptional()
  sortBy?: SortBy = SortBy.DATE_NEWEST;

  @IsArray()
  @IsEnum(FilterType, { each: true })
  @IsOptional()
  filters?: FilterType[] = [];
}
