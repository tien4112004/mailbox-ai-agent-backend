import { Injectable, NotFoundException } from '@nestjs/common';
import { GetEmailsDto } from './dto/get-emails.dto';
import { SendEmailDto } from './dto/send-email.dto';
import { ReplyEmailDto } from './dto/reply-email.dto';
import { ModifyEmailDto } from './dto/modify-email.dto';
import { GmailService } from './gmail.service';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class EmailsService {
  constructor(
    private gmailService: GmailService,
    private authService: AuthService,
  ) {}

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
    
    const { folder = 'INBOX', search, page = 1, limit = 20 } = dto;

    const result = await this.gmailService.listEmails(
      tokens.accessToken,
      tokens.refreshToken,
      folder,
      limit,
      undefined, // pageToken - can be implemented later
      search,
    );

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

    return email;
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
      ? [originalEmail.from.email, ...originalEmail.to.filter(addr => addr !== originalEmail.from.email)]
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
}
