import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, Min, Max, IsBoolean } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class SemanticSearchDto {
    @ApiProperty({
        description: 'The search query string',
        example: 'invoices from last month',
    })
    @IsString()
    @IsOptional()
    query?: string;

    @ApiProperty({
        description: 'The search query string (alias for query)',
        example: 'web',
        required: false
    })
    @IsString()
    @IsOptional()
    q?: string;

    @ApiProperty({
        description: 'Maximum number of results to return',
        example: 10,
        required: false,
        default: 10,
    })
    @IsOptional()
    @IsNumber()
    @Min(1)
    @Max(50)
    limit?: number;

    @ApiPropertyOptional({ example: 'inbox' })
    @IsOptional()
    @IsString()
    folder?: string;

    @ApiPropertyOptional({ example: false })
    @IsOptional()
    @Transform(({ value }) => value === 'true' || value === true)
    @IsBoolean()
    isRead?: boolean;

    @ApiPropertyOptional({ example: true })
    @IsOptional()
    @Transform(({ value }) => value === 'true' || value === true)
    @IsBoolean()
    hasAttachment?: boolean;
}
