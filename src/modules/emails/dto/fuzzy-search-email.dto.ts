import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber, Min, Max } from 'class-validator';

export class FuzzySearchEmailDto {
  @ApiProperty({
    description: 'Search query (subject, sender, or body)',
    example: 'marketing',
  })
  @IsString()
  @IsNotEmpty()
  query: string;

  @ApiProperty({
    description: 'Maximum number of results to return',
    example: 20,
    default: 20,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiProperty({
    description: 'Search fields (subject, from, body)',
    example: 'subject,from',
    default: 'subject,from',
    required: false,
  })
  @IsString()
  @IsOptional()
  fields?: string = 'subject,from';

  @ApiProperty({
    description: 'Similarity threshold (0.0 to 1.0)',
    example: 0.3,
    default: 0.3,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(1)
  threshold?: number = 0.3;
}
