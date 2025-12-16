import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailProvider } from '../interfaces/email-provider.interface';
import { GmailProviderAdapter } from './gmail-provider.adapter';
import { SmtpProviderAdapter } from './smtp-provider.adapter';
import { GmailService } from '../services/gmail.service';
import { ImapService } from '../imap.service';
import { SmtpService } from '../smtp.service';
import { SmtpConfig } from '../../../database/entities/smtp-config.entity';
import { User } from '../../../database/entities/user.entity';

@Injectable()
export class EmailProviderFactory {
  constructor(
    private gmailService: GmailService,
    private imapService: ImapService,
    private smtpService: SmtpService,
    @InjectRepository(SmtpConfig)
    private smtpConfigRepository: Repository<SmtpConfig>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  /**
   * Create email provider based on user's configuration
   */
  async createProvider(userId: string): Promise<EmailProvider> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new Error('User not found');
    }

    // Check if user has Gmail or SMTP provider
    if (user.emailProvider === 'smtp') {
      // Get user's SMTP configuration
      const smtpConfig = await this.smtpConfigRepository.findOne({
        where: { userId, isActive: true, isDefault: true },
      });

      if (!smtpConfig) {
        throw new Error('No active SMTP configuration found');
      }

      return new SmtpProviderAdapter(this.imapService, this.smtpService, {
        imap: {
          user: smtpConfig.imapUsername,
          password: smtpConfig.imapPassword,
          host: smtpConfig.imapHost,
          port: smtpConfig.imapPort,
          tls: smtpConfig.imapSecure,
        },
        smtp: {
          host: smtpConfig.smtpHost,
          port: smtpConfig.smtpPort,
          secure: smtpConfig.smtpSecure,
          auth: {
            user: smtpConfig.smtpUsername,
            pass: smtpConfig.smtpPassword,
          },
        },
        emailAddress: smtpConfig.emailAddress,
      });
    } else {
      // Default to Gmail
      if (!user.gmailAccessToken || !user.gmailRefreshToken) {
        throw new Error('Gmail tokens not found');
      }

      return new GmailProviderAdapter(
        this.gmailService,
        user.gmailAccessToken,
        user.gmailRefreshToken,
      );
    }
  }
}
