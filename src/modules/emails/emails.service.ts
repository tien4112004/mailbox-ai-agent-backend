import { Injectable, NotFoundException } from '@nestjs/common';
import { GetEmailsDto } from './dto/get-emails.dto';
import { SendEmailDto } from './dto/send-email.dto';
import { ReplyEmailDto } from './dto/reply-email.dto';
import { ModifyEmailDto } from './dto/modify-email.dto';
import { EmailProviderFactory } from './providers/email-provider.factory';

// In-memory cache for page tokens (key: userId-folder-limit, value: page -> token map)
const pageTokenCache = new Map<string, Map<number, string>>();

@Injectable()
export class EmailsService {
  constructor(
    private emailProviderFactory: EmailProviderFactory,
  ) {}

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

  async getEmailById(userId: string, emailId: string) {
    const provider = await this.emailProviderFactory.createProvider(userId);
    
    const email = await provider.getEmailById(emailId);

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
