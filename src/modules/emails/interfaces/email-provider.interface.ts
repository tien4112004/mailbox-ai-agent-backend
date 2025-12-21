export interface EmailProvider {
  listMailboxes(): Promise<any[]>;
  listEmails(folder: string, limit: number, pageToken?: string, search?: string, forceSync?: boolean): Promise<any>;
  getEmailById(emailId: string): Promise<any>;
  sendEmail(to: string[], subject: string, body: string, cc?: string[], bcc?: string[], inReplyTo?: string, references?: string): Promise<any>;
  modifyEmail(emailId: string, addLabelIds?: string[], removeLabelIds?: string[]): Promise<void>;
  trashEmail(emailId: string): Promise<void>;
  deleteEmail(emailId: string): Promise<void>;
  getAttachment(messageId: string, attachmentId: string): Promise<any>;
}
