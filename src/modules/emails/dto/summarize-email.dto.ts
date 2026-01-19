import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum } from 'class-validator';
import { SummaryLength, SummaryTone } from '../constants/summary.constants';

export { SummaryLength, SummaryTone };

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

  @ApiProperty({
    type: String,
    description: 'AI Provider to use (e.g. gemini)',
    required: false,
  })
  @IsString()
  @IsOptional()
  provider?: string;
}
