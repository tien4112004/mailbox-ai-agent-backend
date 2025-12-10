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
  Put,
  Delete,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { Response } from 'express';
import { EmailsService } from './emails.service';
import { SnoozeService } from './snooze.service';
import { SummaryService } from './summary.service';
import { KanbanService } from './kanban.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetEmailsDto } from './dto/get-emails.dto';
import { SendEmailDto } from './dto/send-email.dto';
import { ReplyEmailDto } from './dto/reply-email.dto';
import { ModifyEmailDto } from './dto/modify-email.dto';
import { SnoozeEmailDto } from './dto/snooze-email.dto';
import { GetSnoozesDto } from './dto/get-snoozes.dto';
import { SummarizeEmailDto } from './dto/summarize-email.dto';
import { CreateKanbanColumnDto } from './dto/create-kanban-column.dto';
import { MoveCardDto } from './dto/move-card.dto';
import { mockEmails } from './mock-data';

@ApiTags('emails')
@Controller('emails')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class EmailsController {
  constructor(
    private readonly emailsService: EmailsService,
    private readonly snoozeService: SnoozeService,
    private readonly summaryService: SummaryService,
    private readonly kanbanService: KanbanService,
  ) {}

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

  @Post(':id/summary')
  @ApiOperation({ summary: 'Generate a summary for an email using AI' })
  @ApiResponse({
    status: 200,
    description: 'Email summary generated successfully',
    schema: {
      example: {
        id: '18f2a1b3c4d5e6f7',
        subject: 'Meeting Tomorrow',
        summary: 'John proposes a meeting tomorrow at 10 AM to discuss the project roadmap. He requests confirmation of attendance.',
        length: 'medium',
        tone: 'formal',
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Failed to generate summary (OpenAI API error)',
  })
  async generateEmailSummary(
    @Request() req,
    @Param('id') emailId: string,
    @Body() dto: SummarizeEmailDto,
  ) {
    return this.emailsService.generateEmailSummary(
      req.user.id,
      emailId,
      dto,
      this.summaryService,
    );
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

  // ==================== SNOOZE ENDPOINTS ====================

  @Post(':gmailMessageId/snooze')
  @ApiOperation({ summary: 'Snooze an email until a specified time' })
  @ApiResponse({
    status: 200,
    description: 'Email snoozed successfully',
    schema: {
      example: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        emailId: 'email-123',
        gmailMessageId: 'gmail-msg-123',
        userId: 'user-123',
        status: 'snoozed',
        snoozeUntil: '2025-12-15T09:00:00Z',
        snoozeReason: 'Follow up later',
        isRecurring: false,
        createdAt: '2025-12-09T10:00:00Z',
      },
    },
  })
  async snoozeEmail(
    @Request() req,
    @Param('gmailMessageId') gmailMessageId: string,
    @Body() dto: SnoozeEmailDto,
  ) {
    // Extract email ID from Gmail message ID (simplified approach)
    const emailId = gmailMessageId;
    return this.snoozeService.snoozeEmail(
      req.user.id,
      emailId,
      gmailMessageId,
      dto,
    );
  }

  @Get('snoozed/list')
  @ApiOperation({ summary: 'Get all snoozed emails for the user' })
  @ApiResponse({
    status: 200,
    description: 'List of snoozed emails retrieved',
  })
  async getSnoozedEmails(
    @Request() req,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.snoozeService.getSnoozedEmails(req.user.id, page, limit);
  }

  @Get('snoozed/upcoming')
  @ApiOperation({ summary: 'Get upcoming snoozed emails (within N days)' })
  @ApiResponse({
    status: 200,
    description: 'List of upcoming snoozed emails',
  })
  async getUpcomingSnoozed(
    @Request() req,
    @Query('daysAhead') daysAhead: number = 7,
  ) {
    return this.snoozeService.getUpcomingSnoozed(req.user.id, daysAhead);
  }

  @Get('snoozed/count')
  @ApiOperation({ summary: 'Get count of snoozed emails' })
  @ApiResponse({
    status: 200,
    description: 'Count of snoozed emails',
    schema: {
      example: { count: 5 },
    },
  })
  async getSnoozeCount(@Request() req) {
    const count = await this.snoozeService.countSnoozes(req.user.id);
    return { count };
  }

  @Get('snoozed/history')
  @ApiOperation({ summary: 'Get snooze history (all snoozes)' })
  @ApiResponse({
    status: 200,
    description: 'Snooze history retrieved',
  })
  async getSnoozeHistory(
    @Request() req,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.snoozeService.getSnoozeHistory(req.user.id, page, limit);
  }

  @Get('snoozed/:snoozeId')
  @ApiOperation({ summary: 'Get details of a specific snooze' })
  @ApiResponse({
    status: 200,
    description: 'Snooze details retrieved',
  })
  @ApiResponse({
    status: 404,
    description: 'Snooze record not found',
  })
  async getSnoozeDetails(
    @Request() req,
    @Param('snoozeId') snoozeId: string,
  ) {
    return this.snoozeService.getSnoozeDetails(req.user.id, snoozeId);
  }

  @Put('snoozed/:snoozeId/time')
  @ApiOperation({ summary: 'Update snooze time for an existing snooze' })
  @ApiResponse({
    status: 200,
    description: 'Snooze time updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Snooze record not found',
  })
  async updateSnoozeTime(
    @Request() req,
    @Param('snoozeId') snoozeId: string,
    @Body() body: { newSnoozeUntil: string },
  ) {
    return this.snoozeService.updateSnoozeTime(
      req.user.id,
      snoozeId,
      body.newSnoozeUntil,
    );
  }

  @Post('snoozed/:snoozeId/resume')
  @ApiOperation({ summary: 'Resume a snoozed email (bring back to inbox)' })
  @ApiResponse({
    status: 200,
    description: 'Snoozed email resumed successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Snooze record not found',
  })
  async resumeSnooze(@Request() req, @Param('snoozeId') snoozeId: string) {
    return this.snoozeService.resumeSnooze(req.user.id, snoozeId);
  }

  @Post('snoozed/:snoozeId/cancel')
  @ApiOperation({ summary: 'Cancel a snooze' })
  @ApiResponse({
    status: 200,
    description: 'Snooze cancelled successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Snooze record not found',
  })
  async cancelSnooze(@Request() req, @Param('snoozeId') snoozeId: string) {
    return this.snoozeService.cancelSnooze(req.user.id, snoozeId);
  }

  // ==================== KANBAN BOARD ENDPOINTS ====================

  @Get('kanban/board')
  @ApiOperation({ summary: 'Get Kanban board with all columns and cards' })
  @ApiResponse({
    status: 200,
    description: 'Kanban board retrieved successfully',
    schema: {
      example: [
        {
          id: 'col-1',
          name: 'Inbox',
          order: 0,
          status: 'inbox',
          color: '#3B82F6',
          cards: [
            {
              id: 'card-1',
              emailId: 'email-1',
              columnId: 'col-1',
              order: 0,
              notes: 'Follow up needed',
              email: {
                id: 'email-1',
                subject: 'Meeting Tomorrow',
                preview: 'Hi, let\'s meet tomorrow...',
                fromName: 'John Doe',
                fromEmail: 'john@example.com',
              },
            },
          ],
        },
      ],
    },
  })
  async getKanbanBoard(@Request() req) {
    return this.kanbanService.getKanbanBoard(req.user.id);
  }

  @Post('kanban/columns')
  @ApiOperation({ summary: 'Create a new Kanban column' })
  @ApiResponse({
    status: 201,
    description: 'Column created successfully',
  })
  async createKanbanColumn(
    @Request() req,
    @Body() dto: CreateKanbanColumnDto,
  ) {
    return this.kanbanService.createColumn(req.user.id, dto);
  }

  @Put('kanban/columns/:columnId')
  @ApiOperation({ summary: 'Update a Kanban column' })
  @ApiResponse({
    status: 200,
    description: 'Column updated successfully',
  })
  async updateKanbanColumn(
    @Request() req,
    @Param('columnId') columnId: string,
    @Body() dto: Partial<CreateKanbanColumnDto>,
  ) {
    return this.kanbanService.updateColumn(req.user.id, columnId, dto);
  }

  @Delete('kanban/columns/:columnId')
  @ApiOperation({ summary: 'Delete a Kanban column' })
  @ApiResponse({
    status: 200,
    description: 'Column deleted successfully',
  })
  async deleteKanbanColumn(
    @Request() req,
    @Param('columnId') columnId: string,
  ) {
    await this.kanbanService.deleteColumn(req.user.id, columnId);
    return { success: true, message: 'Column deleted successfully' };
  }

  @Post('kanban/cards/move')
  @ApiOperation({ summary: 'Move a card between columns (drag and drop)' })
  @ApiResponse({
    status: 200,
    description: 'Card moved successfully',
    schema: {
      example: {
        id: 'card-1',
        emailId: 'email-1',
        columnId: 'col-2',
        order: 0,
      },
    },
  })
  async moveCard(@Request() req, @Body() dto: MoveCardDto) {
    return this.kanbanService.moveCard(req.user.id, dto);
  }

  @Post('kanban/cards/:emailId/add')
  @ApiOperation({ summary: 'Add an email to a Kanban column' })
  @ApiResponse({
    status: 201,
    description: 'Card added successfully',
  })
  async addCardToColumn(
    @Request() req,
    @Param('emailId') emailId: string,
    @Body() body: { columnId: string; order?: number },
  ) {
    return this.kanbanService.addCardToColumn(
      req.user.id,
      emailId,
      body.columnId,
      body.order,
    );
  }

  @Delete('kanban/cards/:cardId')
  @ApiOperation({ summary: 'Remove a card from Kanban board' })
  @ApiResponse({
    status: 200,
    description: 'Card removed successfully',
  })
  async removeCard(@Request() req, @Param('cardId') cardId: string) {
    await this.kanbanService.removeCard(req.user.id, cardId);
    return { success: true, message: 'Card removed successfully' };
  }

  @Put('kanban/cards/:cardId/notes')
  @ApiOperation({ summary: 'Update Kanban card notes' })
  @ApiResponse({
    status: 200,
    description: 'Card notes updated successfully',
  })
  async updateCardNotes(
    @Request() req,
    @Param('cardId') cardId: string,
    @Body() body: { notes: string },
  ) {
    return this.kanbanService.updateCardNotes(req.user.id, cardId, body.notes);
  }

  @Get('kanban/columns/:columnId/cards')
  @ApiOperation({ summary: 'Get all cards in a specific column' })
  @ApiResponse({
    status: 200,
    description: 'Cards retrieved successfully',
  })
  async getColumnCards(
    @Request() req,
    @Param('columnId') columnId: string,
  ) {
    return this.kanbanService.getColumnCards(req.user.id, columnId);
  }

  @Post('kanban/columns/:columnId/reorder')
  @ApiOperation({ summary: 'Reorder cards within a column' })
  @ApiResponse({
    status: 200,
    description: 'Cards reordered successfully',
  })
  async reorderCards(
    @Request() req,
    @Param('columnId') columnId: string,
    @Body() body: { cardIds: string[] },
  ) {
    return this.kanbanService.reorderCards(req.user.id, columnId, body.cardIds);
  }
}
