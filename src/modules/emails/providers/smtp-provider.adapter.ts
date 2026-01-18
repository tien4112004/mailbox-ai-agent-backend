import { Injectable, Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import { EmailProvider } from '../interfaces/email-provider.interface';
import { ImapService } from '../imap.service';
import { SmtpService } from '../smtp.service';
import { Email } from '../../../database/entities/email.entity';

interface SmtpImapConfig {
  imap: {
    user: string;
    password: string;
    host: string;
    port: number;
    tls: boolean;
  };
  smtp: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
  };
  emailAddress: string;
}

@Injectable()
export class SmtpProviderAdapter implements EmailProvider {
  private readonly logger = new Logger(SmtpProviderAdapter.name);
  constructor(
    private imapService: ImapService,
    private smtpService: SmtpService,
    private config: SmtpImapConfig,
    private userId: string,
    private emailRepository: Repository<Email>,
    private persistEmailsCallback?: (userId: string, emails: any[]) => Promise<any[]>,
  ) { }

  async listMailboxes() {
    return this.imapService.listMailboxes(this.config.imap);
  }

  async listEmails(folder: string, limit: number, pageToken?: string, search?: string, forceSync: boolean = false, filters?: { isRead?: boolean, hasAttachment?: boolean }) {
    const page = pageToken ? parseInt(pageToken.replace('page-', '')) : 1;

    // If not forcing sync, try to get from database first
    if (!forceSync) {
      try {
        const skip = (page - 1) * limit;
        const queryBuilder = this.emailRepository
          .createQueryBuilder('email')
          .where('email.userId = :userId', { userId: this.userId })
          .andWhere('UPPER(email.folder) = UPPER(:folder)', { folder });

        // Add search if provided
        if (search) {
          queryBuilder.andWhere(
            '(email.subject ILIKE :search OR email.fromEmail ILIKE :search OR email.fromName ILIKE :search OR email.body ILIKE :search)',
            { search: `%${search}%` }
          );
        }

        // Apply filters
        if (filters) {
          if (filters.isRead !== undefined) {
            queryBuilder.andWhere('email.read = :isRead', { isRead: filters.isRead });
          }
          if (filters.hasAttachment) {
            queryBuilder.andWhere('jsonb_array_length(email.attachments) > 0');
          }
        }

        const [dbEmails, total] = await queryBuilder
          .orderBy('email.createdAt', 'DESC')
          .skip(skip)
          .take(limit)
          .getManyAndCount();

        // If we have emails in database, return them
        if (dbEmails.length > 0 || page > 1) {
          return {
            emails: dbEmails.map(email => this.formatEmailResponse(email)),
            resultSizeEstimate: total,
            nextPageToken: skip + limit < total ? `page-${page + 1}` : undefined,
          };
        }
      } catch (error) {
        this.logger.error('Error querying database, falling back to SMTP fetch:', error?.stack || error);
      }
    }

    // Step 1: Fetch emails from SMTP/IMAP (on first load or force sync)
    const result = await this.imapService.listEmails(
      this.config.imap,
      folder,
      limit,
      page,
      search,
    );

    // Step 2: Persist emails to database and get the saved emails with IDs
    if (this.persistEmailsCallback && result.emails && result.emails.length > 0) {
      try {
        const savedEmails = await this.persistEmailsCallback(this.userId, result.emails);

        // Step 3: Return the saved emails from database instead of raw IMAP emails
        return {
          emails: savedEmails.map(email => this.formatEmailResponse(email)),
          resultSizeEstimate: result.resultSizeEstimate,
          nextPageToken: result.nextPageToken,
        };
      } catch (error) {
        // Log error but don't fail the request - fallback to IMAP emails
        this.logger.error('Failed to persist SMTP emails to database:', error?.stack || error);
      }
    }

    return result;
  }

  private formatEmailResponse(email: any) {
    return {
      id: email.id,
      subject: email.subject,
      body: email.body,
      snippet: email.preview,
      from: {
        name: email.fromName,
        email: email.fromEmail,
      },
      to: email.toEmail,
      date: email.createdAt,
      read: email.read,
      starred: email.starred,
      folder: email.folder,
      attachments: email.attachments || [],
      threadId: email.threadId,
    };
  }

  async getEmailById(emailId: string) {
    // Query database by UUID instead of using IMAP UID
    const email = await this.emailRepository.findOne({
      where: {
        id: emailId,
        userId: this.userId,
      },
    });

    if (!email) {
      return null;
    }

    // Return in the expected format
    return {
      id: email.id,
      subject: email.subject,
      body: email.body,
      snippet: email.preview,
      from: {
        name: email.fromName,
        email: email.fromEmail,
      },
      to: email.toEmail,
      date: email.createdAt,
      read: email.read,
      starred: email.starred,
      folder: email.folder,
      attachments: email.attachments || []
    };
  }

  async sendEmail(
    to: string[],
    subject: string,
    body: string,
    files?: any[],
    cc?: string[],
    bcc?: string[],
    inReplyTo?: string,
    references?: string,
  ) {
    const referencesArray = references ? [references] : undefined;
    // TODO: support files in SMTP service
    return this.smtpService.sendEmail(
      this.config.smtp,
      this.config.emailAddress,
      to,
      subject,
      body,
      cc,
      bcc,
      inReplyTo,
      referencesArray,
    );
  }

  async modifyEmail(emailId: string, addLabelIds?: string[], removeLabelIds?: string[]) {
    // Convert Gmail label IDs to IMAP flags
    const addFlags = this.convertLabelsToFlags(addLabelIds);
    const removeFlags = this.convertLabelsToFlags(removeLabelIds);

    return this.imapService.modifyEmail(
      this.config.imap,
      emailId,
      addFlags,
      removeFlags,
    );
  }

  async trashEmail(emailId: string) {
    // Move to Trash folder
    return this.imapService.moveEmail(this.config.imap, emailId, 'Trash');
  }

  async deleteEmail(emailId: string) {
    return this.imapService.deleteEmail(this.config.imap, emailId);
  }

  async getAttachment(messageId: string, attachmentId: string) {
    return this.imapService.getAttachment(this.config.imap, messageId, attachmentId);
  }

  /**
   * Convert Gmail label IDs to IMAP flags
   */
  private convertLabelsToFlags(labelIds?: string[]): string[] {
    if (!labelIds) return [];

    const flags = [];
    for (const label of labelIds) {
      switch (label) {
        case 'UNREAD':
          flags.push('\\Seen');
          break;
        case 'STARRED':
          flags.push('\\Flagged');
          break;
        case 'IMPORTANT':
          flags.push('\\Flagged');
          break;
      }
    }
    return flags;
  }
}
