import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class AdvancedSearchDto {
  @ApiProperty({
    example: 'from:john@example.com subject:meeting has:attachment',
    description: 'Search query with criteria. Supports: from:, to:, subject:, contains:, has:attachment, is:read, is:unread, is:starred, folder:'
  })
  @IsString()
  query: string;

  @ApiPropertyOptional({ example: 'inbox' })
  @IsOptional()
  @IsString()
  folder?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional({ example: false, description: 'Force sync from SMTP server' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  forceSync?: boolean = false;
}

export class SuggestionQueryDto {
  @ApiProperty({
    example: 'john',
    description: 'Partial text to search for suggestions'
  })
  @IsString()
  query: string;

  @IsInt()
  @Min(1)
  limit?: number = 10;
}

export class FuzzySearchDto {
  @ApiProperty({
    name: 'q',
    example: 'web',
    description: 'Search query text',
    required: false
  })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({
    example: 'subject,from_email',
    description: 'Comma-separated fields to search in (subject, from_email, body)'
  })
  @IsOptional()
  @IsString()
  fields?: string;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional({ example: 'inbox' })
  @IsOptional()
  @IsString()
  folder?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isRead?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  hasAttachment?: boolean;
}
