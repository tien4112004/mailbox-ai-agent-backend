import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum SummaryLength {
  SHORT = 'short',
  MEDIUM = 'medium',
  LONG = 'long',
}

export enum SummaryTone {
  FORMAL = 'formal',
  CASUAL = 'casual',
  TECHNICAL = 'technical',
}

export class SummarizeEmailDto {
  @ApiProperty({
    enum: SummaryLength,
    default: SummaryLength.MEDIUM,
    description: 'Length of the summary',
  })
  @IsEnum(SummaryLength)
  @IsOptional()
  length?: SummaryLength = SummaryLength.MEDIUM;

  @ApiProperty({
    enum: SummaryTone,
    default: SummaryTone.FORMAL,
    description: 'Tone of the summary',
  })
  @IsEnum(SummaryTone)
  @IsOptional()
  tone?: SummaryTone = SummaryTone.FORMAL;

  @ApiProperty({
    type: String,
    description: 'Custom instructions for the summary',
    required: false,
  })
  @IsString()
  @IsOptional()
  customInstructions?: string;
}
