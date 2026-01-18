import { Injectable } from '@nestjs/common';
import { EmailProvider } from '../interfaces/email-provider.interface';
import { GmailService } from '../services/gmail.service';

@Injectable()
export class GmailProviderAdapter implements EmailProvider {
  constructor(
    private gmailService: GmailService,
    private accessToken: string,
    private refreshToken: string,
  ) { }

  async listMailboxes() {
    return this.gmailService.listMailboxes(this.accessToken, this.refreshToken);
  }

  async listEmails(folder: string, limit: number, pageToken?: string, search?: string, forceSync?: boolean, filters?: { isRead?: boolean, hasAttachment?: boolean }) {
    // Construct Gmail query
    let query = search || '';

    // Append filtering logic to query
    if (filters) {
      if (filters.isRead !== undefined) {
        query += filters.isRead ? ' is:read' : ' is:unread';
      }
      if (filters.hasAttachment) {
        query += ' has:attachment';
      }
    }

    return this.gmailService.listEmails(
      this.accessToken,
      this.refreshToken,
      folder,
      limit,
      pageToken,
      query.trim(), // Pass combined query as search param
    );
  }

  async getEmailById(emailId: string) {
    return this.gmailService.getEmailById(
      this.accessToken,
      this.refreshToken,
      emailId,
    );
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
    return this.gmailService.sendEmail(
      this.accessToken,
      this.refreshToken,
      to,
      subject,
      body,
      files,
      cc,
      bcc,
      inReplyTo,
      references,
    );
  }

  async modifyEmail(emailId: string, addLabelIds?: string[], removeLabelIds?: string[]): Promise<void> {
    await this.gmailService.modifyEmail(
      this.accessToken,
      this.refreshToken,
      emailId,
      addLabelIds,
      removeLabelIds,
    );
  }

  async trashEmail(emailId: string): Promise<void> {
    await this.gmailService.trashEmail(
      this.accessToken,
      this.refreshToken,
      emailId,
    );
  }

  async deleteEmail(emailId: string): Promise<void> {
    await this.gmailService.deleteEmail(
      this.accessToken,
      this.refreshToken,
      emailId,
    );
  }

  async getAttachment(messageId: string, attachmentId: string) {
    return this.gmailService.getAttachment(
      this.accessToken,
      this.refreshToken,
      messageId,
      attachmentId,
    );
  }
}
