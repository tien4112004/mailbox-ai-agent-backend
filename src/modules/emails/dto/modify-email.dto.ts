import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';

export class ModifyEmailDto {
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  read?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  starred?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  trash?: boolean;

  @ApiPropertyOptional({ example: ['IMPORTANT'], type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  addLabels?: string[];

  @ApiPropertyOptional({ example: ['SPAM'], type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  removeLabels?: string[];
}
