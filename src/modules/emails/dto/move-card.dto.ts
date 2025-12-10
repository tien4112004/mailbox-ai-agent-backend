import { IsString, IsNumber, IsOptional } from 'class-validator';

export class MoveCardDto {
  @IsString()
  emailId: string;

  @IsString()
  fromColumnId: string;

  @IsString()
  toColumnId: string;

  @IsOptional()
  @IsNumber()
  order?: number;
}
