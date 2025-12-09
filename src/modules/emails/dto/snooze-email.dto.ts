import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, IsBoolean, IsIn } from 'class-validator';

export class SnoozeEmailDto {
  @ApiProperty({
    description: 'Date and time when the email should reappear',
    example: '2025-12-15T09:00:00Z',
  })
  @IsDateString()
  snoozeUntil: string;

  @ApiPropertyOptional({
    description: 'Reason for snoozing the email',
    example: 'Follow up later',
  })
  @IsOptional()
  @IsString()
  snoozeReason?: string;

  @ApiPropertyOptional({
    description: 'Whether this snooze should recur',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @ApiPropertyOptional({
    description: 'Recurrence pattern (DAILY, WEEKLY, MONTHLY)',
    example: 'WEEKLY',
  })
  @IsOptional()
  @IsIn(['DAILY', 'WEEKLY', 'MONTHLY'])
  recurrencePattern?: string;
}
