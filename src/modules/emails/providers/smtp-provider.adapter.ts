import { Injectable } from '@nestjs/common';
import { EmailProvider } from '../interfaces/email-provider.interface';
import { ImapService } from '../imap.service';
import { SmtpService } from '../smtp.service';

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
  constructor(
    private imapService: ImapService,
    private smtpService: SmtpService,
    private config: SmtpImapConfig,
  ) {}

  async listMailboxes() {
    return this.imapService.listMailboxes(this.config.imap);
  }

  async listEmails(folder: string, limit: number, pageToken?: string, search?: string) {
    const page = pageToken ? parseInt(pageToken.replace('page-', '')) : 1;
    return this.imapService.listEmails(
      this.config.imap,
      folder,
      limit,
      page,
      search,
    );
  }

  async getEmailById(emailId: string) {
    return this.imapService.getEmailById(this.config.imap, emailId);
  }

  async sendEmail(
    to: string[],
    subject: string,
    body: string,
    cc?: string[],
    bcc?: string[],
    inReplyTo?: string,
    references?: string,
  ) {
    const referencesArray = references ? [references] : undefined;
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
