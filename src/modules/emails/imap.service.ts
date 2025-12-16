import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import * as Imap from 'imap';
import { simpleParser, ParsedMail, Attachment } from 'mailparser';
import { promisify } from 'util';

interface ImapConfig {
  user: string;
  password: string;
  host: string;
  port: number;
  tls: boolean;
}

interface EmailMessage {
  id: string;
  threadId: string;
  from: {
    email: string;
    name?: string;
  };
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  body: string;
  snippet: string;
  date: Date;
  isRead: boolean;
  isStarred: boolean;
  hasAttachments: boolean;
  attachments: Array<{
    filename: string;
    mimeType: string;
    size: number;
    attachmentId: string;
  }>;
  labels: string[];
  labelIds: string[];
}

@Injectable()
export class ImapService {
  private readonly logger = new Logger(ImapService.name);

  /**
   * Create IMAP connection
   */
  private createConnection(config: ImapConfig): Imap {
    return new Imap({
      user: config.user,
      password: config.password,
      host: config.host,
      port: config.port,
      tls: config.tls,
      tlsOptions: { rejectUnauthorized: false },
      authTimeout: 10000,
      connTimeout: 10000,
    });
  }

  /**
   * Connect to IMAP server
   */
  private connectImap(imap: Imap): Promise<void> {
    return new Promise((resolve, reject) => {
      imap.once('ready', () => resolve());
      imap.once('error', (err) => reject(err));
      imap.connect();
    });
  }

  /**
   * Open a mailbox
   */
  private openBox(imap: Imap, boxName: string): Promise<Imap.Box> {
    return promisify(imap.openBox.bind(imap))(boxName, false);
  }

  /**
   * List mailboxes (folders)
   */
  async listMailboxes(config: ImapConfig) {
    const imap = this.createConnection(config);

    try {
      await this.connectImap(imap);

      const boxes = await promisify(imap.getBoxes.bind(imap))();
      
      const mailboxes = this.flattenBoxes(boxes);

      imap.end();

      return mailboxes.map((box) => ({
        id: box.path,
        name: box.name,
        type: this.getMailboxType(box.path),
        messagesTotal: 0,
        messagesUnread: 0,
      }));
    } catch (error) {
      this.logger.error('Error listing mailboxes', error);
      imap.end();
      throw new InternalServerErrorException('Failed to list mailboxes');
    }
  }

  /**
   * Flatten nested mailbox structure
   */
  private flattenBoxes(
    boxes: Imap.MailBoxes,
    parent = '',
  ): Array<{ name: string; path: string }> {
    const result = [];

    for (const [name, box] of Object.entries(boxes)) {
      const path = parent ? `${parent}/${name}` : name;
      result.push({ name, path });

      if (box.children) {
        result.push(...this.flattenBoxes(box.children, path));
      }
    }

    return result;
  }

  /**
   * Get mailbox type from path
   */
  private getMailboxType(path: string): string {
    const lowerPath = path.toLowerCase();
    if (lowerPath === 'inbox') return 'inbox';
    if (lowerPath.includes('sent')) return 'sent';
    if (lowerPath.includes('draft')) return 'drafts';
    if (lowerPath.includes('trash') || lowerPath.includes('deleted'))
      return 'trash';
    if (lowerPath.includes('spam') || lowerPath.includes('junk')) return 'spam';
    return 'custom';
  }

  /**
   * List emails from a mailbox
   */
  async listEmails(
    config: ImapConfig,
    folder: string = 'INBOX',
    limit: number = 20,
    page: number = 1,
    searchQuery?: string,
  ) {
    const imap = this.createConnection(config);

    try {
      await this.connectImap(imap);
      const box = await this.openBox(imap, folder);

      // Build search criteria
      let searchCriteria: any[] = ['ALL'];
      if (searchQuery) {
        searchCriteria = [['OR', ['SUBJECT', searchQuery], ['FROM', searchQuery], ['BODY', searchQuery]]];
      }

      const uids = await this.searchMessages(imap, searchCriteria);
      
      // Pagination
      const start = Math.max(0, uids.length - page * limit);
      const end = Math.max(0, uids.length - (page - 1) * limit);
      const paginatedUids = uids.slice(start, end).reverse();

      const emails = [];
      
      if (paginatedUids.length > 0) {
        const messages = await this.fetchMessages(imap, paginatedUids);
        
        for (const msg of messages) {
          const parsed = await simpleParser(msg.body);
          emails.push(this.parseEmail(msg.uid.toString(), parsed, msg.attrs));
        }
      }

      imap.end();

      return {
        emails,
        resultSizeEstimate: box.messages.total,
        nextPageToken: page * limit < uids.length ? `page-${page + 1}` : undefined,
      };
    } catch (error) {
      this.logger.error('Error listing emails', error);
      imap.end();
      throw new InternalServerErrorException('Failed to list emails');
    }
  }

  /**
   * Search messages in IMAP
   */
  private searchMessages(imap: Imap, criteria: any[]): Promise<number[]> {
    return new Promise((resolve, reject) => {
      imap.search(criteria, (err, uids) => {
        if (err) reject(err);
        else resolve(uids || []);
      });
    });
  }

  /**
   * Fetch messages from IMAP
   */
  private fetchMessages(
    imap: Imap,
    uids: number[],
  ): Promise<Array<{ uid: number; body: Buffer; attrs: any }>> {
    return new Promise((resolve, reject) => {
      const messages = [];
      const fetch = imap.fetch(uids, {
        bodies: '',
        struct: true,
      });

      fetch.on('message', (msg, seqno) => {
        let body = Buffer.alloc(0);
        let attrs;

        msg.on('body', (stream) => {
          stream.on('data', (chunk) => {
            body = Buffer.concat([body, chunk]);
          });
        });

        msg.once('attributes', (msgAttrs) => {
          attrs = msgAttrs;
        });

        msg.once('end', () => {
          messages.push({ uid: attrs.uid, body, attrs });
        });
      });

      fetch.once('error', reject);
      fetch.once('end', () => resolve(messages));
    });
  }

  /**
   * Get email by ID (UID)
   */
  async getEmailById(
    config: ImapConfig,
    emailId: string,
    folder: string = 'INBOX',
  ) {
    const imap = this.createConnection(config);

    try {
      await this.connectImap(imap);
      await this.openBox(imap, folder);

      const uid = parseInt(emailId);
      const messages = await this.fetchMessages(imap, [uid]);

      if (messages.length === 0) {
        imap.end();
        return null;
      }

      const parsed = await simpleParser(messages[0].body);
      const email = this.parseEmail(emailId, parsed, messages[0].attrs);

      imap.end();
      return email;
    } catch (error) {
      this.logger.error('Error getting email by ID', error);
      imap.end();
      throw new InternalServerErrorException('Failed to get email');
    }
  }

  /**
   * Parse email from ParsedMail to our format
   */
  private parseEmail(uid: string, parsed: ParsedMail, attrs: any): EmailMessage {
    const from = parsed.from?.value?.[0];
    const to = parsed.to?.value || [];
    const cc = parsed.cc?.value || [];
    const bcc = parsed.bcc?.value || [];

    const flags = attrs.flags || [];
    const isRead = flags.includes('\\Seen');
    const isStarred = flags.includes('\\Flagged');

    return {
      id: uid,
      threadId: parsed.messageId || uid,
      from: {
        email: from?.address || '',
        name: from?.name,
      },
      to: to.map((addr: any) => addr.address),
      cc: cc.map((addr: any) => addr.address),
      bcc: bcc.map((addr: any) => addr.address),
      subject: parsed.subject || '(No Subject)',
      body: parsed.html || parsed.textAsHtml || parsed.text || '',
      snippet: (parsed.text || '').substring(0, 200),
      date: parsed.date || new Date(),
      isRead,
      isStarred,
      hasAttachments: parsed.attachments.length > 0,
      attachments: parsed.attachments.map((att, index) => ({
        filename: att.filename || `attachment-${index}`,
        mimeType: att.contentType || 'application/octet-stream',
        size: att.size || 0,
        attachmentId: `${uid}-${index}`,
      })),
      labels: [],
      labelIds: [],
    };
  }

  /**
   * Modify email (mark as read, star, etc.)
   */
  async modifyEmail(
    config: ImapConfig,
    emailId: string,
    addFlags?: string[],
    removeFlags?: string[],
    folder: string = 'INBOX',
  ) {
    const imap = this.createConnection(config);

    try {
      await this.connectImap(imap);
      await this.openBox(imap, folder);

      const uid = parseInt(emailId);

      if (addFlags && addFlags.length > 0) {
        await this.addFlags(imap, uid, addFlags);
      }

      if (removeFlags && removeFlags.length > 0) {
        await this.removeFlags(imap, uid, removeFlags);
      }

      imap.end();
    } catch (error) {
      this.logger.error('Error modifying email', error);
      imap.end();
      throw new InternalServerErrorException('Failed to modify email');
    }
  }

  /**
   * Add flags to message
   */
  private addFlags(imap: Imap, uid: number, flags: string[]): Promise<void> {
    return promisify(imap.addFlags.bind(imap))(uid, flags);
  }

  /**
   * Remove flags from message
   */
  private removeFlags(imap: Imap, uid: number, flags: string[]): Promise<void> {
    return promisify(imap.delFlags.bind(imap))(uid, flags);
  }

  /**
   * Move email to folder
   */
  async moveEmail(
    config: ImapConfig,
    emailId: string,
    destinationFolder: string,
    sourceFolder: string = 'INBOX',
  ) {
    const imap = this.createConnection(config);

    try {
      await this.connectImap(imap);
      await this.openBox(imap, sourceFolder);

      const uid = parseInt(emailId);
      await promisify(imap.move.bind(imap))(uid, destinationFolder);

      imap.end();
    } catch (error) {
      this.logger.error('Error moving email', error);
      imap.end();
      throw new InternalServerErrorException('Failed to move email');
    }
  }

  /**
   * Delete email permanently
   */
  async deleteEmail(
    config: ImapConfig,
    emailId: string,
    folder: string = 'INBOX',
  ) {
    const imap = this.createConnection(config);

    try {
      await this.connectImap(imap);
      await this.openBox(imap, folder);

      const uid = parseInt(emailId);
      await this.addFlags(imap, uid, ['\\Deleted']);
      await promisify(imap.expunge.bind(imap))();

      imap.end();
    } catch (error) {
      this.logger.error('Error deleting email', error);
      imap.end();
      throw new InternalServerErrorException('Failed to delete email');
    }
  }

  /**
   * Get attachment
   */
  async getAttachment(
    config: ImapConfig,
    emailId: string,
    attachmentId: string,
    folder: string = 'INBOX',
  ) {
    const imap = this.createConnection(config);

    try {
      await this.connectImap(imap);
      await this.openBox(imap, folder);

      const uid = parseInt(emailId);
      const messages = await this.fetchMessages(imap, [uid]);

      if (messages.length === 0) {
        imap.end();
        throw new InternalServerErrorException('Email not found');
      }

      const parsed = await simpleParser(messages[0].body);
      const [, attachmentIndex] = attachmentId.split('-');
      const attachment = parsed.attachments[parseInt(attachmentIndex)];

      if (!attachment) {
        imap.end();
        throw new InternalServerErrorException('Attachment not found');
      }

      imap.end();

      return {
        filename: attachment.filename,
        mimeType: attachment.contentType,
        data: attachment.content.toString('base64'),
        size: attachment.size,
      };
    } catch (error) {
      this.logger.error('Error getting attachment', error);
      imap.end();
      throw new InternalServerErrorException('Failed to get attachment');
    }
  }
}
