import { IsString, IsNumber, IsBoolean, IsOptional, IsEmail } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSmtpConfigDto {
  @ApiProperty({ description: 'Email address' })
  @IsEmail()
  emailAddress: string;

  @ApiPropertyOptional({ description: 'Display name' })
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiProperty({ description: 'IMAP server host' })
  @IsString()
  imapHost: string;

  @ApiPropertyOptional({ description: 'IMAP server port', default: 993 })
  @IsOptional()
  @IsNumber()
  imapPort?: number;

  @ApiPropertyOptional({ description: 'Use TLS for IMAP', default: true })
  @IsOptional()
  @IsBoolean()
  imapSecure?: boolean;

  @ApiProperty({ description: 'IMAP username' })
  @IsString()
  imapUsername: string;

  @ApiProperty({ description: 'IMAP password' })
  @IsString()
  imapPassword: string;

  @ApiProperty({ description: 'SMTP server host' })
  @IsString()
  smtpHost: string;

  @ApiPropertyOptional({ description: 'SMTP server port', default: 587 })
  @IsOptional()
  @IsNumber()
  smtpPort?: number;

  @ApiPropertyOptional({ description: 'Use TLS for SMTP', default: false })
  @IsOptional()
  @IsBoolean()
  smtpSecure?: boolean;

  @ApiProperty({ description: 'SMTP username' })
  @IsString()
  smtpUsername: string;

  @ApiProperty({ description: 'SMTP password' })
  @IsString()
  smtpPassword: string;

  @ApiPropertyOptional({ description: 'Set as default account', default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
