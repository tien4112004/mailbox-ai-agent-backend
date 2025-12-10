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
    const tokens = await this.authService.getGmailTokens(userId);
    
    const mailboxes = await this.gmailService.listMailboxes(
      tokens.accessToken,
      tokens.refreshToken,
    );

    return mailboxes;
  }

  async getEmails(userId: string, dto: GetEmailsDto) {
    const tokens = await this.authService.getGmailTokens(userId);
    
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

    const result = await this.gmailService.listEmails(
      tokens.accessToken,
      tokens.refreshToken,
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

  async getEmailById(userId: string, emailId: string) {
    const tokens = await this.authService.getGmailTokens(userId);
    
    const email = await this.gmailService.getEmailById(
      tokens.accessToken,
      tokens.refreshToken,
      emailId,
    );

    if (!email) {
      throw new NotFoundException('Email not found');
    }

    // Map 'to' field from Gmail API to 'toEmail' for database
    return {
      ...email,
      toEmail: email.to,
    };
  }

  async sendEmail(userId: string, dto: SendEmailDto) {
    const tokens = await this.authService.getGmailTokens(userId);
    
    const result = await this.gmailService.sendEmail(
      tokens.accessToken,
      tokens.refreshToken,
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
    const tokens = await this.authService.getGmailTokens(userId);
    
    // Get original email to extract metadata
    const originalEmail = await this.gmailService.getEmailById(
      tokens.accessToken,
      tokens.refreshToken,
      emailId,
    );

    // Prepare reply
    const to = dto.replyAll 
      ? [originalEmail.from.email, ...originalEmail.to.filter((addr: string) => addr !== originalEmail.from.email)]
      : [originalEmail.from.email];
    
    const cc = dto.replyAll ? originalEmail.cc : (dto.cc || []);
    const subject = originalEmail.subject.startsWith('Re:') 
      ? originalEmail.subject 
      : `Re: ${originalEmail.subject}`;

    const result = await this.gmailService.sendEmail(
      tokens.accessToken,
      tokens.refreshToken,
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
    const tokens = await this.authService.getGmailTokens(userId);
    
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
      await this.gmailService.trashEmail(
        tokens.accessToken,
        tokens.refreshToken,
        emailId,
      );
      return { message: 'Email moved to trash' };
    }

    // Modify labels
    if (addLabelIds.length > 0 || removeLabelIds.length > 0) {
      await this.gmailService.modifyEmail(
        tokens.accessToken,
        tokens.refreshToken,
        emailId,
        addLabelIds.length > 0 ? addLabelIds : undefined,
        removeLabelIds.length > 0 ? removeLabelIds : undefined,
      );
    }

    return { message: 'Email modified successfully' };
  }

  async deleteEmail(userId: string, emailId: string) {
    const tokens = await this.authService.getGmailTokens(userId);
    
    await this.gmailService.deleteEmail(
      tokens.accessToken,
      tokens.refreshToken,
      emailId,
    );

    return { message: 'Email deleted permanently' };
  }

  async getAttachment(
    userId: string,
    messageId: string,
    attachmentId: string,
  ) {
    const tokens = await this.authService.getGmailTokens(userId);
    
    const attachment = await this.gmailService.getAttachment(
      tokens.accessToken,
      tokens.refreshToken,
      messageId,
      attachmentId,
    );

    return attachment;
  }

  async markAsRead(userId: string, emailId: string) {
    return this.modifyEmail(userId, emailId, { read: true });
  }

  async toggleStar(userId: string, emailId: string) {
    const tokens = await this.authService.getGmailTokens(userId);
    
    // Get current email to check if starred
    const email = await this.gmailService.getEmailById(
      tokens.accessToken,
      tokens.refreshToken,
      emailId,
    );

    const isStarred = email.labelIds?.includes('STARRED') || false;
    
    return this.modifyEmail(userId, emailId, { starred: !isStarred });
  }

  async generateEmailSummary(
    userId: string,
    emailId: string,
    dto,
    summaryService,
  ) {
    // Fetch the email details
    const email = await this.getEmailById(userId, emailId);

    if (!email) {
      throw new NotFoundException('Email not found');
    }

    // Prepare email content for summarization
    const emailContent = {
      subject: email.subject || '',
      from: email.from?.email || email.from || '',
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
