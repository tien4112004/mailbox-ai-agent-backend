import { IsOptional, IsBoolean, IsString, IsNumber } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSmtpConfigDto {
  @ApiPropertyOptional({ description: 'Display name' })
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiPropertyOptional({ description: 'IMAP server host' })
  @IsOptional()
  @IsString()
  imapHost?: string;

  @ApiPropertyOptional({ description: 'IMAP server port' })
  @IsOptional()
  @IsNumber()
  imapPort?: number;

  @ApiPropertyOptional({ description: 'Use TLS for IMAP' })
  @IsOptional()
  @IsBoolean()
  imapSecure?: boolean;

  @ApiPropertyOptional({ description: 'IMAP username' })
  @IsOptional()
  @IsString()
  imapUsername?: string;

  @ApiPropertyOptional({ description: 'IMAP password' })
  @IsOptional()
  @IsString()
  imapPassword?: string;

  @ApiPropertyOptional({ description: 'SMTP server host' })
  @IsOptional()
  @IsString()
  smtpHost?: string;

  @ApiPropertyOptional({ description: 'SMTP server port' })
  @IsOptional()
  @IsNumber()
  smtpPort?: number;

  @ApiPropertyOptional({ description: 'Use TLS for SMTP' })
  @IsOptional()
  @IsBoolean()
  smtpSecure?: boolean;

  @ApiPropertyOptional({ description: 'SMTP username' })
  @IsOptional()
  @IsString()
  smtpUsername?: string;

  @ApiPropertyOptional({ description: 'SMTP password' })
  @IsOptional()
  @IsString()
  smtpPassword?: string;

  @ApiPropertyOptional({ description: 'Set as active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Set as default account' })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
