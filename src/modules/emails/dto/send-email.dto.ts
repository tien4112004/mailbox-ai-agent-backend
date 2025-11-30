import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SendEmailDto {
  @ApiProperty({ example: ['recipient@example.com'], type: [String] })
  @IsArray()
  @IsEmail({}, { each: true })
  @IsNotEmpty()
  to: string[];

  @ApiProperty({ example: 'Meeting Tomorrow' })
  @IsString()
  @IsNotEmpty()
  subject: string;

  @ApiProperty({ example: '<p>Hi, let\'s meet tomorrow at 10 AM.</p>' })
  @IsString()
  @IsNotEmpty()
  body: string;

  @ApiPropertyOptional({ example: ['cc@example.com'], type: [String] })
  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  cc?: string[];

  @ApiPropertyOptional({ example: ['bcc@example.com'], type: [String] })
  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  bcc?: string[];
}
