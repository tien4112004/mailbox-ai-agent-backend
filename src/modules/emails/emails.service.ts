import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GetEmailsDto } from './dto/get-emails.dto';
import { SendEmailDto } from './dto/send-email.dto';
import { ReplyEmailDto } from './dto/reply-email.dto';
import { ModifyEmailDto } from './dto/modify-email.dto';
import { Email } from '../../database/entities/email.entity';
import { GmailService } from './gmail.service';
import { AuthService } from '../auth/auth.service';
import { EmailProviderFactory } from './providers/email-provider.factory';

// In-memory cache for page tokens (key: userId-folder-limit, value: page -> token map)
const pageTokenCache = new Map<string, Map<number, string>>();

@Injectable()
export class EmailsService {
  private readonly logger = new Logger(EmailsService.name);

  constructor(
    @InjectRepository(Email)
    private emailRepository: Repository<Email>,
    private gmailService: GmailService,
    private authService: AuthService,
    private emailProviderFactory: EmailProviderFactory,
  ) {}

  /**
   * Sync initial emails from Gmail inbox to database (last 3 days)
   */
  async syncInitialEmails(userId: string): Promise<number> {
    try {
      const tokens = await this.authService.getGmailTokens(userId);
      
      // Fetch emails from Gmail inbox
      const result = await this.gmailService.listEmails(
        tokens.accessToken,
        tokens.refreshToken,
        'INBOX',
        50, // Fetch up to 50 emails
      );

      if (!result.emails || result.emails.length === 0) {
        this.logger.log(`No emails found for user ${userId}`);
        return 0;
      }

      // Filter emails from last 3 days
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      const recentEmails = result.emails.filter((email: any) => {
        const emailDate = new Date(email.date);
        return emailDate >= threeDaysAgo;
      });

      if (recentEmails.length === 0) {
        this.logger.log(`No recent emails from last 3 days for user ${userId}`);
        return 0;
      }

      // Convert Gmail emails to Email entity format
      const emailsToSave = recentEmails.map((gmailEmail: any) => {
        return this.emailRepository.create({
          subject: gmailEmail.subject || '',
          body: gmailEmail.body || '',
          preview: gmailEmail.snippet || '',
          fromName: gmailEmail.from?.name || '',
          fromEmail: gmailEmail.from?.email || '',
          toEmail: gmailEmail.to?.map((t: any) => t.email) || [],
          read: !gmailEmail.labels?.includes('UNREAD'),
          starred: gmailEmail.labels?.includes('STARRED') || false,
          folder: 'INBOX',
          attachments: gmailEmail.attachments || null,
          userId,
          createdAt: new Date(gmailEmail.date),
        });
      });

      // Save emails, ignoring duplicates
      const savedEmails = await Promise.all(
        emailsToSave.map(async (email) => {
          // Check if email already exists (by unique combination of userId, fromEmail, subject, and date)
          const existing = await this.emailRepository.findOne({
            where: {
              userId,
              fromEmail: email.fromEmail,
              subject: email.subject,
              createdAt: email.createdAt,
            },
          });

          if (existing) {
            return null; // Skip duplicate
          }

          return this.emailRepository.save(email);
        }),
      );

      const savedCount = savedEmails.filter((e) => e !== null).length;
      this.logger.log(
        `Synced ${savedCount} recent emails to database for user ${userId}`,
      );

      return savedCount;
    } catch (error) {
      this.logger.error(
        `Error syncing initial emails for user ${userId}:`,
        error,
      );
      throw error;
    }
  }

  async getMailboxes(userId: string) {
    const provider = await this.emailProviderFactory.createProvider(userId);
    const mailboxes = await provider.listMailboxes();
    return mailboxes;
  }

  async getEmails(userId: string, dto: GetEmailsDto) {
    const provider = await this.emailProviderFactory.createProvider(userId);
    
    let { folder = 'INBOX', search, page = 1, limit = 20, pageToken } = dto;
    
    // Normalize folder to uppercase (Gmail labels are case-sensitive)
    folder = folder.toUpperCase();

    // Create cache key
    const cacheKey = `${userId}-${folder}-${limit}`;
    
    // If page > 1 and no pageToken provided, try to get from cache
    if (page > 1 && !pageToken) {
      const userCache = pageTokenCache.get(cacheKey);
      if (userCache) {
        pageToken = userCache.get(page);
      }
    }

    const result = await provider.listEmails(
      folder,
      limit,
      pageToken,
      search,
    );

    // Store next page token in cache
    if (result.nextPageToken) {
      if (!pageTokenCache.has(cacheKey)) {
        pageTokenCache.set(cacheKey, new Map());
      }
      const userCache = pageTokenCache.get(cacheKey);
      userCache.set(page + 1, result.nextPageToken);
    }

    return {
      emails: result.emails,
      pagination: {
        total: result.resultSizeEstimate || 0,
        page,
        limit,
        totalPages: Math.ceil((result.resultSizeEstimate || 0) / limit),
        nextPageToken: result.nextPageToken,
      },
    };
  }

  /**
   * Normalize email response format for consistent FE handling
   * Converts both database and Gmail API formats to a unified structure
   */
  private normalizeEmailResponse(email: any, isFromDatabase: boolean = false) {
    if (isFromDatabase) {
      // Database format -> Unified format
      return {
        id: email.id,
        threadId: null, // Database emails don't have thread IDs
        subject: email.subject || '',
        from: {
          name: email.fromName || '',
          email: email.fromEmail || '',
        },
        to: email.toEmail || [],
        cc: [],
        bcc: [],
        date: email.createdAt,
        snippet: email.preview || '',
        body: email.body || '',
        htmlBody: email.body || '',
        textBody: email.body || '',
        read: email.read || false,
        starred: email.starred || false,
        folder: email.folder || 'INBOX',
        labelIds: [],
        attachments: email.attachments || [],
        summary: email.summary || null,
      };
    } else {
      // Gmail API format -> Unified format
      return {
        id: email.id,
        threadId: email.threadId || null,
        subject: email.subject || '',
        from: email.from || { name: '', email: '' },
        to: email.to || [],
        cc: email.cc || [],
        bcc: email.bcc || [],
        date: email.date,
        snippet: email.snippet || '',
        body: email.body || email.htmlBody || '',
        htmlBody: email.htmlBody || '',
        textBody: email.textBody || '',
        read: email.read || false,
        starred: email.starred || false,
        folder: 'INBOX',
        labelIds: email.labelIds || [],
        attachments: email.attachments || [],
        summary: null,
      };
    }
  }

  async getEmailById(userId: string, emailId: string) {
    const provider = await this.emailProviderFactory.createProvider(userId);
    
    const email = await provider.getEmailById(emailId);

    if (!email) {
      throw new NotFoundException('Email not found');
    }

    return this.normalizeEmailResponse(email, false);
  }

  async sendEmail(userId: string, dto: SendEmailDto) {
    const provider = await this.emailProviderFactory.createProvider(userId);
    
    const result = await provider.sendEmail(
      dto.to,
      dto.subject,
      dto.body,
      dto.cc,
      dto.bcc,
    );

    return {
      message: 'Email sent successfully',
      messageId: result.id,
      threadId: result.threadId,
    };
  }

  async replyToEmail(userId: string, emailId: string, dto: ReplyEmailDto) {
    const provider = await this.emailProviderFactory.createProvider(userId);
    
    // Get original email to extract metadata
    const originalEmail = await provider.getEmailById(emailId);

    // Prepare reply
    const to = dto.replyAll 
      ? [originalEmail.from.email, ...originalEmail.to.filter((addr: string) => addr !== originalEmail.from.email)]
      : [originalEmail.from.email];
    
    const cc = dto.replyAll ? originalEmail.cc : (dto.cc || []);
    const subject = originalEmail.subject.startsWith('Re:') 
      ? originalEmail.subject 
      : `Re: ${originalEmail.subject}`;

    const result = await provider.sendEmail(
      to,
      subject,
      dto.body,
      cc,
      undefined,
      `<${emailId}>`, // In-Reply-To
      `<${emailId}>`, // References
    );

    return {
      message: 'Reply sent successfully',
      messageId: result.id,
      threadId: result.threadId,
    };
  }

  async modifyEmail(userId: string, emailId: string, dto: ModifyEmailDto) {
    const provider = await this.emailProviderFactory.createProvider(userId);
    
    const addLabelIds: string[] = dto.addLabels || [];
    const removeLabelIds: string[] = dto.removeLabels || [];

    // Handle read/unread
    if (dto.read !== undefined) {
      if (dto.read) {
        removeLabelIds.push('UNREAD');
      } else {
        addLabelIds.push('UNREAD');
      }
    }

    // Handle starred
    if (dto.starred !== undefined) {
      if (dto.starred) {
        addLabelIds.push('STARRED');
      } else {
        removeLabelIds.push('STARRED');
      }
    }

    // Handle trash
    if (dto.trash) {
      await provider.trashEmail(emailId);
      return { message: 'Email moved to trash' };
    }

    // Modify labels
    if (addLabelIds.length > 0 || removeLabelIds.length > 0) {
      await provider.modifyEmail(
        emailId,
        addLabelIds.length > 0 ? addLabelIds : undefined,
        removeLabelIds.length > 0 ? removeLabelIds : undefined,
      );
    }

    return { message: 'Email modified successfully' };
  }

  async deleteEmail(userId: string, emailId: string) {
    const provider = await this.emailProviderFactory.createProvider(userId);
    
    await provider.deleteEmail(emailId);

    return { message: 'Email deleted permanently' };
  }

  async getAttachment(
    userId: string,
    messageId: string,
    attachmentId: string,
  ) {
    const provider = await this.emailProviderFactory.createProvider(userId);
    
    const attachment = await provider.getAttachment(messageId, attachmentId);

    return attachment;
  }

  async markAsRead(userId: string, emailId: string) {
    return this.modifyEmail(userId, emailId, { read: true });
  }

  async toggleStar(userId: string, emailId: string) {
    const provider = await this.emailProviderFactory.createProvider(userId);
    
    // Get current email to check if starred
    const email = await provider.getEmailById(emailId);

    const isStarred = email.labelIds?.includes('STARRED') || email.isStarred || false;
    
    return this.modifyEmail(userId, emailId, { starred: !isStarred });
  }

  async generateEmailSummary(
    userId: string,
    emailId: string,
    dto,
    summaryService,
  ) {
    // Fetch the email details (normalized format)
    const email = await this.getEmailById(userId, emailId);

    if (!email) {
      throw new NotFoundException('Email not found');
    }

    // Prepare email content for summarization
    const emailContent = {
      subject: email.subject || '',
      from: email.from?.email || '',
      body: email.body || email.snippet || '',
      date: email.date,
    };

    // Generate summary using the SummaryService with optional provider override
    const summary = await summaryService.generateSummary(
      emailContent,
      dto,
      dto.provider,
    );

    return {
      id: emailId,
      subject: email.subject,
      from: email.from,
      summary,
      length: dto.length,
      tone: dto.tone,
      provider: dto.provider,
    };
  }
}

