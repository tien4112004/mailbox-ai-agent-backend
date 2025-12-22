import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber, Min, Max, IsBoolean } from 'class-validator';

export class SearchEmailDto {
  @ApiProperty({ description: 'Search query (subject, sender, or body)', example: 'money' })
  @IsString()
  @IsNotEmpty()
  query: string;

  @ApiProperty({ description: 'Maximum number of results to return', example: 20, default: 20, required: false })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiProperty({ description: 'Search fields (subject, from_email, body)', example: 'subject,from_email', default: 'subject,from_email', required: false })
  @IsString()
  @IsOptional()
  fields?: string = 'subject,from_email';

  @ApiProperty({ description: 'Similarity threshold (0.0 to 1.0) for trigram searches', example: 0.3, default: 0.3, required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(1)
  threshold?: number = 0.3;

  @ApiProperty({ description: 'Enable semantic search (embeddings) when available', example: true, default: true, required: false })
  @IsBoolean()
  @IsOptional()
  enableSemantic?: boolean = true;
}
