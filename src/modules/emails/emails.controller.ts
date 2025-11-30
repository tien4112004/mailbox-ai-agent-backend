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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { EmailsService } from './emails.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetEmailsDto } from './dto/get-emails.dto';
import { SendEmailDto } from './dto/send-email.dto';
import { ReplyEmailDto } from './dto/reply-email.dto';
import { ModifyEmailDto } from './dto/modify-email.dto';

@ApiTags('emails')
@Controller('emails')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class EmailsController {
  constructor(private readonly emailsService: EmailsService) {}

  @Get('mailboxes')
  @ApiOperation({ summary: 'Get all mailboxes (Gmail labels)' })
  @ApiResponse({ status: 200, description: 'List of mailboxes retrieved' })
  async getMailboxes(@Request() req) {
    return this.emailsService.getMailboxes(req.user.id);
  }

  @Get('list')
  @ApiOperation({ summary: 'Get emails with filters and pagination' })
  @ApiResponse({ status: 200, description: 'List of emails retrieved' })
  async getEmails(@Request() req, @Query() dto: GetEmailsDto) {
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
  @ApiResponse({ status: 200, description: 'Email sent successfully' })
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
  @ApiResponse({ status: 200, description: 'Email modified successfully' })
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
