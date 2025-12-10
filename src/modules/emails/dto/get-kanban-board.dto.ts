import { IsString, IsOptional } from 'class-validator';

export class GetKanbanBoardDto {
  @IsOptional()
  @IsString()
  userId?: string;
}
