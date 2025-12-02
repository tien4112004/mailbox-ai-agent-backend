import {
  Controller,
  Get,
  Param,
  Query,
  Post,
  Body,
  UseGuards,
  Request,
  Res,
  HttpStatus,
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { Response } from 'express';
import { EmailsService } from './emails.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetEmailsDto } from './dto/get-emails.dto';
import { SendEmailDto } from './dto/send-email.dto';
import { ReplyEmailDto } from './dto/reply-email.dto';
import { ModifyEmailDto } from './dto/modify-email.dto';
import { mockEmails } from './mock-data';

@ApiTags('emails')
@Controller('emails')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class EmailsController {
  constructor(private readonly emailsService: EmailsService) {}

  @Get('mailboxes')
  @ApiOperation({ summary: 'Get all mailboxes (Gmail labels)' })
  @ApiResponse({ 
    status: 200, 
    description: 'List of mailboxes retrieved',
    schema: {
      example: [
        { id: 'INBOX', name: 'INBOX', messagesTotal: 42, messagesUnread: 5 },
        { id: 'SENT', name: 'Sent', messagesTotal: 120, messagesUnread: 0 }
      ]
    }
  })
  async getMailboxes(@Request() req) {
    return this.emailsService.getMailboxes(req.user.id);
  }

  @Get('list')
  @ApiOperation({ summary: 'Get emails with filters and pagination' })
  @ApiHeader({ name: 'Mock', required: false, description: 'Set to "true" for mock data' })
  @ApiResponse({ 
    status: 200, 
    description: 'List of emails retrieved',
    schema: {
      example: {
        emails: [
          {
            id: '18f2a1b3c4d5e6f7',
            threadId: '18f2a1b3c4d5e6f7',
            subject: 'Meeting Tomorrow',
            from: { name: 'John Doe', email: 'john@example.com' },
            to: ['you@example.com'],
            date: '2025-12-02T10:30:00.000Z',
            snippet: 'Hi, let\'s meet tomorrow at 10 AM...',
            read: false,
            starred: false
          }
        ],
        pagination: {
          total: 100,
          page: 1,
          limit: 20,
          totalPages: 5,
          nextPageToken: 'token123'
        }
      }
    }
  })
  async getEmails(
    @Request() req, 
    @Query() dto: GetEmailsDto,
    @Headers('mock') mockHeader?: string
  ) {
    // Mock mode - return fake emails
    if (mockHeader === 'true') {
      return {
        emails: mockEmails,
        pagination: {
          total: mockEmails.length,
          page: 1,
          limit: 20,
          totalPages: 1,
          nextPageToken: null,
        },
      };
    }
    
    return this.emailsService.getEmails(req.user.id, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get email detail by ID' })
  @ApiResponse({ status: 200, description: 'Email detail retrieved' })
  @ApiResponse({ status: 404, description: 'Email not found' })
  async getEmailById(@Request() req, @Param('id') id: string) {
    return this.emailsService.getEmailById(req.user.id, id);
  }

  @Post('send')
  @ApiOperation({ summary: 'Send a new email' })
  @ApiResponse({ 
    status: 200, 
    description: 'Email sent successfully',
    schema: {
      example: {
        id: '18f2a1b3c4d5e6f7',
        threadId: '18f2a1b3c4d5e6f7',
        labelIds: ['SENT']
      }
    }
  })
  async sendEmail(@Request() req, @Body() dto: SendEmailDto) {
    return this.emailsService.sendEmail(req.user.id, dto);
  }

  @Post(':id/reply')
  @ApiOperation({ summary: 'Reply to an email' })
  @ApiResponse({ status: 200, description: 'Reply sent successfully' })
  async replyToEmail(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: ReplyEmailDto,
  ) {
    return this.emailsService.replyToEmail(req.user.id, id, dto);
  }

  @Post(':id/modify')
  @ApiOperation({ summary: 'Modify email (read, star, trash, labels)' })
  @ApiResponse({ 
    status: 200, 
    description: 'Email modified successfully',
    schema: {
      example: {
        id: '18f2a1b3c4d5e6f7',
        labelIds: ['INBOX', 'UNREAD'],
        success: true
      }
    }
  })
  async modifyEmail(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: ModifyEmailDto,
  ) {
    return this.emailsService.modifyEmail(req.user.id, id, dto);
  }

  @Post(':id/delete')
  @ApiOperation({ summary: 'Permanently delete an email' })
  @ApiResponse({ status: 200, description: 'Email deleted permanently' })
  async deleteEmail(@Request() req, @Param('id') id: string) {
    return this.emailsService.deleteEmail(req.user.id, id);
  }

  @Get(':messageId/attachments/:attachmentId')
  @ApiOperation({ summary: 'Download email attachment' })
  @ApiResponse({ status: 200, description: 'Attachment downloaded' })
  async getAttachment(
    @Request() req,
    @Param('messageId') messageId: string,
    @Param('attachmentId') attachmentId: string,
    @Res() res: Response,
  ) {
    const attachment = await this.emailsService.getAttachment(
      req.user.id,
      messageId,
      attachmentId,
    );

    // Decode base64 attachment data
    const buffer = Buffer.from(
      attachment.data.replace(/-/g, '+').replace(/_/g, '/'),
      'base64',
    );

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Length', buffer.length);
    res.status(HttpStatus.OK).send(buffer);
  }

  // Legacy endpoints for backward compatibility
  @Get('mailboxes/:folderId/emails')
  @ApiOperation({ summary: 'Get emails in a specific mailbox (legacy)' })
  async getEmailsByFolder(
    @Request() req,
    @Param('folderId') folderId: string,
    @Query() dto: GetEmailsDto,
  ) {
    return this.emailsService.getEmails(req.user.id, {
      ...dto,
      folder: folderId,
    });
  }

  @Post(':id/read')
  @ApiOperation({ summary: 'Mark email as read (legacy)' })
  async markAsRead(@Request() req, @Param('id') id: string) {
    return this.emailsService.markAsRead(req.user.id, id);
  }

  @Post(':id/star')
  @ApiOperation({ summary: 'Toggle email star (legacy)' })
  async toggleStar(@Request() req, @Param('id') id: string) {
    return this.emailsService.toggleStar(req.user.id, id);
  }
}
