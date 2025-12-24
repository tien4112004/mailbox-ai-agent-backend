import { IsString, IsNumber, IsOptional, IsBoolean } from 'class-validator';

export class CreateKanbanColumnDto {
  @IsString()
  name: string;

  @IsNumber()
  order: number;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  labelId?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
