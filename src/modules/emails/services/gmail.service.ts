import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { simpleParser } from 'mailparser';

@Injectable()
export class GmailService {
  private readonly logger = new Logger(GmailService.name);
  private oauth2Client: OAuth2Client;

  constructor(private configService: ConfigService) {
    this.oauth2Client = new google.auth.OAuth2(
      this.configService.get<string>('GOOGLE_CLIENT_ID'),
      this.configService.get<string>('GOOGLE_CLIENT_SECRET'),
      this.configService.get<string>('GOOGLE_REDIRECT_URI'),
    );
  }

  /**
   * Get OAuth2 URL for user to authorize Gmail access
   */
  getAuthUrl(state?: string): string {
    const scopes = [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.labels',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent', // Force to get refresh token
      state: state, // Pass frontend URL to get it back in callback
    });
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string) {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      return tokens;
    } catch (error) {
      this.logger.error('Error exchanging code for tokens', error);
      throw new UnauthorizedException('Failed to exchange authorization code');
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string) {
    try {
      this.oauth2Client.setCredentials({
        refresh_token: refreshToken,
      });
      const { credentials } = await this.oauth2Client.refreshAccessToken();
      return credentials;
    } catch (error) {
      this.logger.error('Error refreshing access token', error);
      throw new UnauthorizedException('Failed to refresh access token');
    }
  }

  /**
   * Get Gmail client with user's credentials
   */
  private getGmailClient(accessToken: string, refreshToken: string) {
    const auth = new google.auth.OAuth2(
      this.configService.get<string>('GOOGLE_CLIENT_ID'),
      this.configService.get<string>('GOOGLE_CLIENT_SECRET'),
      this.configService.get<string>('GOOGLE_REDIRECT_URI'),
    );

    auth.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    return google.gmail({ version: 'v1', auth });
  }

  /**
   * Handle Gmail API errors and convert to appropriate exceptions
   */
  private handleGmailError(error: any): never {
    const errorMessage = error?.message || '';
    const errorResponse = error?.response?.data?.error || '';

    // Check for OAuth invalid_grant error
    if (errorMessage.includes('invalid_grant') || errorResponse === 'invalid_grant') {
      this.logger.error('Gmail OAuth token invalid or expired - user needs to re-authenticate');
      throw new UnauthorizedException('GMAIL_AUTH_EXPIRED');
    }

    // Check for other authentication errors
    if (error?.code === 401 || errorMessage.includes('invalid credentials') || errorMessage.includes('unauthorized')) {
      this.logger.error('Gmail authentication failed', error);
      throw new UnauthorizedException('GMAIL_AUTH_FAILED');
    }

    // Re-throw other errors as-is
    this.logger.error('Gmail API error', error);
    throw error;
  }

  /**
   * List mailboxes (labels) from Gmail
   */
  async listMailboxes(accessToken: string, refreshToken: string) {
    try {
      const gmail = this.getGmailClient(accessToken, refreshToken);
      const response = await gmail.users.labels.list({
        userId: 'me',
      });

      const labels = response.data.labels || [];

      // Map Gmail labels to our mailbox format
      return labels
        .filter((label) =>
          label.type === 'system' ||
          (label.labelListVisibility === 'labelShow' && label.name)
        )
        .map((label) => ({
          id: label.id,
          name: label.name,
          messagesTotal: label.messagesTotal || 0,
          messagesUnread: label.messagesUnread || 0,
          type: label.type,
        }));
    } catch (error) {
      this.handleGmailError(error);
    }
  }

  /**
   * List emails from a specific mailbox with pagination
   */
  async listEmails(
    accessToken: string,
    refreshToken: string,
    labelId: string = 'INBOX',
    maxResults: number = 20,
    pageToken?: string,
    query?: string,
  ) {
    try {
      const gmail = this.getGmailClient(accessToken, refreshToken);

      const listParams: any = {
        userId: 'me',
        maxResults,
        labelIds: [labelId],
      };

      if (pageToken) {
        listParams.pageToken = pageToken;
      }

      if (query) {
        listParams.q = query;
      }

      const response = await gmail.users.messages.list(listParams);

      const messages = response.data.messages || [];

      // Fetch full details for each message
      const emailPromises = messages.map((msg) =>
        this.getEmailById(accessToken, refreshToken, msg.id),
      );

      const emails = await Promise.all(emailPromises);

      return {
        emails,
        nextPageToken: response.data.nextPageToken,
        resultSizeEstimate: response.data.resultSizeEstimate,
      };
    } catch (error) {
      this.handleGmailError(error);
    }
  }

  /**
   * Get email by ID with full details
   */
  async getEmailById(accessToken: string, refreshToken: string, emailId: string) {
    // Normalize and validate message id (strip angle brackets and whitespace)
    const normalizedId = (emailId || '').toString().trim().replace(/^<|>$/g, '');
    if (!normalizedId) {
      this.logger.error(`Invalid Gmail message id: ${emailId}`);
      throw new Error('Invalid id value');
    }

    try {
      const gmail = this.getGmailClient(accessToken, refreshToken);

      const response = await gmail.users.messages.get({
        userId: 'me',
        id: normalizedId,
        format: 'full',
      });

      const message = response.data;
      const headers = message.payload?.headers || [];

      // Extract header values
      const getHeader = (name: string) => 
        headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value || '';

      const subject = getHeader('Subject');
      const from = getHeader('From');
      const to = getHeader('To');
      const date = getHeader('Date');
      const cc = getHeader('Cc');
      const bcc = getHeader('Bcc');

      // Parse email body
      const { htmlBody, textBody } = this.extractBody(message.payload);
      
      // Extract attachments
      const attachments = this.extractAttachments(message.payload);

      // Check if read/unread
      const isUnread = message.labelIds?.includes('UNREAD') || false;
      const isStarred = message.labelIds?.includes('STARRED') || false;

      return {
        id: message.id,
        threadId: message.threadId,
        subject,
        from: this.parseEmailAddress(from),
        to: this.parseEmailAddresses(to),
        cc: cc ? this.parseEmailAddresses(cc) : [],
        bcc: bcc ? this.parseEmailAddresses(bcc) : [],
        date: new Date(date),
        snippet: message.snippet,
        body: htmlBody || textBody || '',
        htmlBody,
        textBody,
        read: !isUnread,
        starred: isStarred,
        labelIds: message.labelIds || [],
        attachments,
        internalDate: message.internalDate,
      };
    } catch (error) {
      // Normalize common API errors for clarity
      const msg = (error as any)?.message || '';
      if (msg.includes('Invalid id value')) {
        this.logger.error(`Invalid Gmail message id provided: ${emailId}`);
        throw new Error('Invalid id value');
      }

      this.logger.error(`Error getting email ${emailId}`, error);
      throw error;
    }
  }

  /**
   * Extract body from email payload
   */
  private extractBody(payload: any): { htmlBody: string; textBody: string } {
    let htmlBody = '';
    let textBody = '';

    if (!payload) {
      return { htmlBody, textBody };
    }

    // Check if body is in the main payload
    if (payload.body?.data) {
      const mimeType = payload.mimeType;
      const decodedData = this.decodeBase64(payload.body.data);
      
      if (mimeType === 'text/html') {
        htmlBody = decodedData;
      } else if (mimeType === 'text/plain') {
        textBody = decodedData;
      }
    }

    // Check parts for multipart messages
    if (payload.parts) {
      for (const part of payload.parts) {
        if (part.mimeType === 'text/html' && part.body?.data) {
          htmlBody = this.decodeBase64(part.body.data);
        } else if (part.mimeType === 'text/plain' && part.body?.data) {
          textBody = this.decodeBase64(part.body.data);
        } else if (part.parts) {
          // Recursive for nested parts
          const nested = this.extractBody(part);
          if (!htmlBody) htmlBody = nested.htmlBody;
          if (!textBody) textBody = nested.textBody;
        }
      }
    }

    return { htmlBody, textBody };
  }

  /**
   * Extract attachments from email payload
   */
  private extractAttachments(payload: any): any[] {
    const attachments = [];

    if (!payload || !payload.parts) {
      return attachments;
    }

    const extractFromParts = (parts: any[]) => {
      for (const part of parts) {
        if (part.filename && part.body?.attachmentId) {
          attachments.push({
            id: part.body.attachmentId,
            filename: part.filename,
            mimeType: part.mimeType,
            size: part.body.size,
          });
        }
        
        if (part.parts) {
          extractFromParts(part.parts);
        }
      }
    };

    extractFromParts(payload.parts);
    return attachments;
  }

  /**
   * Get attachment data
   */
  async getAttachment(
    accessToken: string,
    refreshToken: string,
    messageId: string,
    attachmentId: string,
  ) {
    try {
      const gmail = this.getGmailClient(accessToken, refreshToken);
      
      const response = await gmail.users.messages.attachments.get({
        userId: 'me',
        messageId,
        id: attachmentId,
      });

      return {
        data: response.data.data,
        size: response.data.size,
      };
    } catch (error) {
      this.logger.error('Error getting attachment', error);
      throw error;
    }
  }

  /**
   * Send email
   */
  async sendEmail(
    accessToken: string,
    refreshToken: string,
    to: string[],
    subject: string,
    body: string,
    cc?: string[],
    bcc?: string[],
    inReplyTo?: string,
    references?: string,
  ) {
    try {
      const gmail = this.getGmailClient(accessToken, refreshToken);

      // Create email message
      const messageParts = [
        `To: ${to.join(', ')}`,
        ...(cc && cc.length ? [`Cc: ${cc.join(', ')}`] : []),
        ...(bcc && bcc.length ? [`Bcc: ${bcc.join(', ')}`] : []),
        `Subject: ${subject}`,
        'Content-Type: text/html; charset=utf-8',
        ...(inReplyTo ? [`In-Reply-To: ${inReplyTo}`] : []),
        ...(references ? [`References: ${references}`] : []),
        '',
        body,
      ];

      const message = messageParts.join('\n');
      const encodedMessage = Buffer.from(message)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const response = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedMessage,
        },
      });

      return response.data;
    } catch (error) {
      this.logger.error('Error sending email', error);
      throw error;
    }
  }

  /**
   * Modify email labels (mark read/unread, star, etc.)
   */
  async modifyEmail(
    accessToken: string,
    refreshToken: string,
    messageId: string,
    addLabelIds?: string[],
    removeLabelIds?: string[],
  ) {
    try {
      const gmail = this.getGmailClient(accessToken, refreshToken);

      const response = await gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: {
          addLabelIds,
          removeLabelIds,
        },
      });

      return response.data;
    } catch (error) {
      this.logger.error('Error modifying email', error);
      throw error;
    }
  }

  /**
   * Trash email
   */
  async trashEmail(accessToken: string, refreshToken: string, messageId: string) {
    try {
      const gmail = this.getGmailClient(accessToken, refreshToken);

      const response = await gmail.users.messages.trash({
        userId: 'me',
        id: messageId,
      });

      return response.data;
    } catch (error) {
      this.logger.error('Error trashing email', error);
      throw error;
    }
  }

  /**
   * Delete email permanently
   */
  async deleteEmail(accessToken: string, refreshToken: string, messageId: string) {
    try {
      const gmail = this.getGmailClient(accessToken, refreshToken);

      await gmail.users.messages.delete({
        userId: 'me',
        id: messageId,
      });

      return { success: true };
    } catch (error) {
      this.logger.error('Error deleting email', error);
      throw error;
    }
  }

  /**
   * Helper: Decode base64 URL-safe string
   */
  private decodeBase64(data: string): string {
    try {
      const buff = Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
      return buff.toString('utf-8');
    } catch (error) {
      this.logger.error('Error decoding base64', error);
      return '';
    }
  }

  /**
   * Helper: Parse email address with name
   */
  private parseEmailAddress(address: string): { name: string; email: string } {
    if (!address) return { name: '', email: '' };

    // Match "Name <email@example.com>" or just "email@example.com"
    const match = address.match(/^(?:"?([^"]*)"?\s)?<?([^>]+)>?$/);
    
    if (match) {
      return {
        name: match[1]?.trim() || match[2]?.split('@')[0] || '',
        email: match[2]?.trim() || '',
      };
    }

    return {
      name: address.split('@')[0] || '',
      email: address,
    };
  }

  /**
   * Helper: Parse multiple email addresses
   */
  private parseEmailAddresses(addresses: string): string[] {
    if (!addresses) return [];
    
    return addresses
      .split(',')
      .map((addr) => addr.trim())
      .filter((addr) => addr);
  }

  /**
   * Get user profile from Gmail
   */
  async getUserProfile(accessToken: string, refreshToken: string) {
    try {
      const gmail = this.getGmailClient(accessToken, refreshToken);

      const response = await gmail.users.getProfile({
        userId: 'me',
      });

      return response.data;
    } catch (error) {
      this.handleGmailError(error);
    }
  }
}
