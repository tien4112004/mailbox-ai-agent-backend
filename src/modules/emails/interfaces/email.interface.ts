export interface Email {
  id: string;
  from: { name: string; email: string };
  to: string[];
  subject: string;
  preview: string;
  body: string;
  date: Date;
  read: boolean;
  starred: boolean;
  folder: string;
  attachments?: Array<{ name: string; size: string; type: string }>;
}
