import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';

export class SemanticSearchDto {
    @ApiProperty({
        description: 'The search query string',
        example: 'invoices from last month',
    })
    @IsString()
    query: string;

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
}
