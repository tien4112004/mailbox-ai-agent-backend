import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class GetEmailsDto {
  @ApiPropertyOptional({ example: 'inbox' })
  @IsOptional()
  @IsString()
  folder?: string;

  @ApiPropertyOptional({ example: 'meeting' })
  @IsOptional()
  @IsString()
  search?: string;

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

  @ApiPropertyOptional({ example: 'ABCDEFtoken123', description: 'Token for next page from previous response' })
  @IsOptional()
  @IsString()
  pageToken?: string;

  @ApiPropertyOptional({ example: false, description: 'Force sync from SMTP server (default: false, uses database cache)' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  forceSync?: boolean = false;

  @ApiPropertyOptional({ example: false, description: 'Filter by read status (true=read, false=unread)' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isRead?: boolean;

  @ApiPropertyOptional({ example: true, description: 'Filter by attachment presence' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  hasAttachment?: boolean;
}
