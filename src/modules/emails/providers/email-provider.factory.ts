import { Injectable, Logger } from '@nestjs/common';
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
import { Email } from '../../../database/entities/email.entity';

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
    @InjectRepository(Email)
    private emailRepository: Repository<Email>,
  ) { }

  /**
   * Persist emails to database callback for SMTP provider
   */
  private async persistEmailsCallback(userId: string, emails: any[]): Promise<number> {
    const logger = new Logger(EmailProviderFactory.name);
    try {
      const emailsToSave = emails.map((email) => {
        return this.emailRepository.create({
          subject: email.subject || '',
          body: email.body || '',
          preview: email.snippet || '',
          fromName: email.from?.name || '',
          fromEmail: email.from?.email || email.from || '',
          toEmail: Array.isArray(email.to) ? email.to : [],
          read: email.isRead !== undefined ? email.isRead : !email.labelIds?.includes('UNREAD'),
          starred: email.isStarred !== undefined ? email.isStarred : email.labelIds?.includes('STARRED') || false,
          folder: email.folder || 'INBOX',
          attachments: email.attachments || null,
          userId,
          createdAt: new Date(email.date),
        });
      });

      const savedEmails = await Promise.all(
        emailsToSave.map(async (email) => {
          // Check if email already exists
          const existing = await this.emailRepository.findOne({
            where: {
              userId,
              fromEmail: email.fromEmail,
              subject: email.subject,
              createdAt: email.createdAt,
            },
          });

          if (existing) {
            logger.debug(`Email already exists, skipping: ${email.subject}`);
            return null;
          }

          return this.emailRepository.save(email);
        }),
      );

      const savedCount = savedEmails.filter((e) => e !== null).length;
      logger.log(`Persisted ${savedCount} SMTP emails for user ${userId}`);
      return savedCount;
    } catch (error) {
      logger.error(`Error persisting SMTP emails for user ${userId}:`, error);
      throw error;
    }
  }

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

      return new SmtpProviderAdapter(
        this.imapService,
        this.smtpService,
        {
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
        },
        userId,
        this.persistEmailsCallback.bind(this),
      );
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
