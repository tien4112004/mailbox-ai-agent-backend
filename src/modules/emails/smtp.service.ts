import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import * as Mail from 'nodemailer/lib/mailer';

interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

@Injectable()
export class SmtpService {
  private readonly logger = new Logger(SmtpService.name);

  /**
   * Create SMTP transporter
   */
  private createTransporter(config: SmtpConfig): Transporter {
    return nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth,
      tls: {
        rejectUnauthorized: false,
      },
    });
  }

  /**
   * Send email via SMTP
   */
  async sendEmail(
    config: SmtpConfig,
    from: string,
    to: string[],
    subject: string,
    body: string,
    cc?: string[],
    bcc?: string[],
    inReplyTo?: string,
    references?: string[],
    attachments?: Array<{
      filename: string;
      content: Buffer | string;
      contentType?: string;
    }>,
  ) {
    const transporter = this.createTransporter(config);

    try {
      const mailOptions: Mail.Options = {
        from,
        to: to.join(', '),
        subject,
        html: body,
      };

      if (cc && cc.length > 0) {
        mailOptions.cc = cc.join(', ');
      }

      if (bcc && bcc.length > 0) {
        mailOptions.bcc = bcc.join(', ');
      }

      if (inReplyTo) {
        mailOptions.inReplyTo = inReplyTo;
      }

      if (references && references.length > 0) {
        mailOptions.references = references.join(' ');
      }

      if (attachments && attachments.length > 0) {
        mailOptions.attachments = attachments.map((att) => ({
          filename: att.filename,
          content: att.content,
          contentType: att.contentType,
          encoding: 'base64',
        }));
      }

      const info = await transporter.sendMail(mailOptions);

      this.logger.log(`Email sent: ${info.messageId}`);

      return {
        id: info.messageId,
        threadId: info.messageId,
        success: true,
      };
    } catch (error) {
      this.logger.error('Error sending email via SMTP', error);
      throw new InternalServerErrorException('Failed to send email');
    }
  }

  /**
   * Verify SMTP connection
   */
  async verifyConnection(config: SmtpConfig): Promise<boolean> {
    const transporter = this.createTransporter(config);

    try {
      await transporter.verify();
      this.logger.log('SMTP connection verified successfully');
      return true;
    } catch (error) {
      this.logger.error('SMTP connection verification failed', error);
      throw new InternalServerErrorException('Failed to verify SMTP connection');
    }
  }
}
