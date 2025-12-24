import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, ILike, Not, IsNull } from 'typeorm';
import { GetEmailsDto } from '../dto/get-emails.dto';
import { SendEmailDto } from '../dto/send-email.dto';
import { ReplyEmailDto } from '../dto/reply-email.dto';
import { ModifyEmailDto } from '../dto/modify-email.dto';
import { AdvancedSearchDto, SuggestionQueryDto } from '../dto/advanced-search.dto';
import { Email } from '../../../database/entities/email.entity';
import { GmailService } from './gmail.service';
import { EmailProviderFactory } from '../providers/email-provider.factory';
import { AuthService } from '../../auth/auth.service';
import { SearchQueryParser, SearchCriteria } from './search-query-parser.service';

// In-memory cache for page tokens (key: userId-folder-limit, value: page -> token map)
const pageTokenCache = new Map<string, Map<number, string>>();

@Injectable()
export class EmailsService {
  private readonly logger = new Logger(EmailsService.name);

  constructor(
    @InjectRepository(Email)
    private emailRepository: Repository<Email>,
    private gmailService: GmailService,
    private authService: AuthService,
    private emailProviderFactory: EmailProviderFactory,
    private searchQueryParser: SearchQueryParser,
  ) { }

  async syncInitialEmails(userId: string): Promise<number> {
    try {
      this.logger.log(`Starting initial email sync for user ${userId}`);

      let tokens;
      try {
        tokens = await this.authService.getGmailTokens(userId);
      } catch (error) {
        this.logger.error(
          `Failed to get Gmail tokens for user ${userId}. User may not have connected Gmail account.`,
          error,
        );
        throw error;
      }

      this.logger.debug(`Retrieved Gmail tokens for user ${userId}`);

      // Delete all existing emails for this user to ensure fresh sync
      const deleteResult = await this.emailRepository.delete({ userId });
      this.logger.log(
        `Deleted ${deleteResult.affected} old emails for user ${userId}`,
      );

      // Fetch emails from Gmail inbox
      let result;
      try {
        result = await this.gmailService.listEmails(
          tokens.accessToken,
          tokens.refreshToken,
          'INBOX',
          100, // Fetch up to 100 emails
        );
      } catch (error) {
        this.logger.error(
          `Failed to fetch emails from Gmail for user ${userId}`,
          error,
        );
        throw error;
      }

      if (!result.emails || result.emails.length === 0) {
        this.logger.log(`No emails found in Gmail INBOX for user ${userId}`);
        return 0;
      }

      this.logger.log(`Fetched ${result.emails.length} emails from Gmail INBOX for user ${userId}`);

      // Use all fetched emails (no 3-day filter)
      const recentEmails = result.emails;

      this.logger.log(`Found ${recentEmails.length} emails from Gmail for user ${userId}`);

      // Convert Gmail emails to Email entity format
      const emailsToSave = recentEmails.map((gmailEmail: any) => {
        return this.emailRepository.create({
          subject: gmailEmail.subject || '',
          body: gmailEmail.body || '',
          preview: gmailEmail.snippet || '',
          fromName: gmailEmail.from?.name || '',
          fromEmail: gmailEmail.from?.email || '',
          toEmail: gmailEmail.to?.map((t: any) => t.email) || [],
          read: !gmailEmail.labels?.includes('UNREAD'),
          starred: gmailEmail.labels?.includes('STARRED') || false,
          folder: 'INBOX',
          attachments: gmailEmail.attachments || null,
          messageId: gmailEmail.id || null,
          userId,
          createdAt: new Date(gmailEmail.date),
        });
      });

      // Save all emails (no duplicate check since we already deleted old ones)
      const savedEmails = await this.emailRepository.save(emailsToSave);

      this.logger.log(
        `Successfully synced ${savedEmails.length} emails to database for user ${userId}`,
      );

      return savedEmails.length;
    } catch (error) {
      this.logger.error(
        `Error syncing initial emails for user ${userId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Persist emails to database, avoiding duplicates
   */
  async persistEmails(userId: string, emails: any[]): Promise<number> {
    try {
      const emailsToSave = emails.map((email) => {
        return this.emailRepository.create({
          subject: email.subject || '',
          body: email.body || '',
          preview: email.snippet || '',
          fromName: email.from?.name || '',
          fromEmail: email.from?.email || email.from || '',
          toEmail: Array.isArray(email.to) ? email.to : [],
          read: email.isRead !== undefined ? email.isRead : !email.labelIds?.includes('UNREAD'),
          starred: email.isStarred !== undefined ? email.isStarred : email.labelIds?.includes('STARRED') || false,
          folder: email.folder || 'INBOX',
          attachments: email.attachments || null,
          // Preserve provider message id if available (Gmail/IMAP)
          messageId: (email.messageId || email.id || email.threadId) || null,
          userId,
          createdAt: new Date(email.date),
        });
      });

      const savedEmails = await Promise.all(
        emailsToSave.map(async (email) => {
          // Check if email already exists (by unique combination of userId, fromEmail, subject, and date)
          const existing = await this.emailRepository.findOne({
            where: {
              userId,
              fromEmail: email.fromEmail,
              subject: email.subject,
              createdAt: email.createdAt,
            },
          });

          if (existing) {
            this.logger.debug(`Email already exists, skipping: ${email.subject} from ${email.fromEmail}`);
            return null; // Skip duplicate
          }

          return this.emailRepository.save(email);
        }),
      );

      const savedCount = savedEmails.filter((e) => e !== null).length;
      this.logger.log(
        `Successfully persisted ${savedCount} emails to database for user ${userId}`,
      );

      return savedCount;
    } catch (error) {
      this.logger.error(
        `Error persisting emails for user ${userId}:`,
        error,
      );
      throw error;
    }
  }

  async getMailboxes(userId: string) {
    const provider = await this.emailProviderFactory.createProvider(userId);
    const mailboxes = await provider.listMailboxes();
    return mailboxes;
  }

  async getEmails(userId: string, dto: GetEmailsDto) {
    const provider = await this.emailProviderFactory.createProvider(userId);

    let { folder = 'INBOX', search, page = 1, limit = 20, pageToken, forceSync = false } = dto;

    // Normalize folder to uppercase (Gmail labels are case-sensitive)
    folder = folder.toUpperCase();

    // Create cache key
    const cacheKey = `${userId}-${folder}-${limit}`;

    // If page > 1 and no pageToken provided, try to get from cache
    if (page > 1 && !pageToken) {
      const userCache = pageTokenCache.get(cacheKey);
      if (userCache) {
        pageToken = userCache.get(page);
      }
    }

    const result = await provider.listEmails(
      folder,
      limit,
      pageToken,
      search,
      forceSync,
    );

    // Store next page token in cache
    if (result.nextPageToken) {
      if (!pageTokenCache.has(cacheKey)) {
        pageTokenCache.set(cacheKey, new Map());
      }
      const userCache = pageTokenCache.get(cacheKey);
      userCache.set(page + 1, result.nextPageToken);
    }

    return {
      emails: result.emails,
      pagination: {
        total: result.resultSizeEstimate || 0,
        page,
        limit,
        totalPages: Math.ceil((result.resultSizeEstimate || 0) / limit),
        nextPageToken: result.nextPageToken,
      },
    };
  }

  /**
   * Normalize email response format for consistent FE handling
   * Converts both database and Gmail API formats to a unified structure
   */
  private normalizeEmailResponse(email: any, isFromDatabase: boolean = false) {
    if (isFromDatabase) {
      // Database format -> Unified format
      return {
        id: email.id,
        threadId: null, // Database emails don't have thread IDs
        subject: email.subject || '',
        from: {
          name: email.fromName || '',
          email: email.fromEmail || '',
        },
        to: email.toEmail || [],
        cc: [],
        bcc: [],
        date: email.createdAt,
        snippet: email.preview || '',
        body: email.body || '',
        htmlBody: email.body || '',
        textBody: email.body || '',
        read: email.read || false,
        starred: email.starred || false,
        folder: email.folder || 'INBOX',
        labelIds: [],
        attachments: email.attachments || [],
        summary: email.summary || null,
        source: 'db',
        gmailMessageId: email.messageId || null,
      };
    } else {
      // Gmail API format -> Unified format
      return {
        id: email.id,
        threadId: email.threadId || null,
        subject: email.subject || '',
        from: email.from || { name: '', email: '' },
        to: email.to || [],
        cc: email.cc || [],
        bcc: email.bcc || [],
        date: email.date,
        snippet: email.snippet || '',
        body: email.body || email.htmlBody || '',
        htmlBody: email.htmlBody || '',
        textBody: email.textBody || '',
        read: email.read || false,
        starred: email.starred || false,
        folder: 'INBOX',
        labelIds: email.labelIds || [],
        attachments: email.attachments || [],
        summary: null,
        source: 'gmail',
        gmailMessageId: email.id,
      };
    }
  }

  async getEmailById(userId: string, emailId: string) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (uuidRegex.test(emailId)) {
      const dbEmail = await this.emailRepository.findOne({ where: { id: emailId, userId } });
      if (dbEmail) {
        if (dbEmail.messageId) {
          try {
            const provider = await this.emailProviderFactory.createProvider(userId);
            const providerEmail = await provider.getEmailById(dbEmail.messageId);
            if (providerEmail) return this.normalizeEmailResponse(providerEmail, false);
          } catch (err) {
            this.logger.debug(`Provider fetch failed for ${dbEmail.messageId}, falling back to DB: ${err.message}`);
            return this.normalizeEmailResponse(dbEmail, true);
          }
        }

        return this.normalizeEmailResponse(dbEmail, true);
      }
      // DB miss - fallthrough to provider lookup
    }

    const provider = await this.emailProviderFactory.createProvider(userId);
    const email = await provider.getEmailById(emailId);
    if (!email) throw new NotFoundException('Email not found');
    return this.normalizeEmailResponse(email, false);
  }

  async sendEmail(userId: string, dto: SendEmailDto) {
    const provider = await this.emailProviderFactory.createProvider(userId);

    const result = await provider.sendEmail(
      dto.to,
      dto.subject,
      dto.body,
      dto.cc,
      dto.bcc,
    );

    return {
      message: 'Email sent successfully',
      messageId: result.id,
      threadId: result.threadId,
    };
  }

  async replyToEmail(userId: string, emailId: string, dto: ReplyEmailDto) {
    const provider = await this.emailProviderFactory.createProvider(userId);

    // Get original email to extract metadata
    const originalEmail = await provider.getEmailById(emailId);

    // Prepare reply
    const to = dto.replyAll
      ? [originalEmail.from.email, ...originalEmail.to.filter((addr: string) => addr !== originalEmail.from.email)]
      : [originalEmail.from.email];

    const cc = dto.replyAll ? originalEmail.cc : (dto.cc || []);
    const subject = originalEmail.subject.startsWith('Re:')
      ? originalEmail.subject
      : `Re: ${originalEmail.subject}`;

    const result = await provider.sendEmail(
      to,
      subject,
      dto.body,
      cc,
      undefined,
      `<${emailId}>`, // In-Reply-To
      `<${emailId}>`, // References
    );

    return {
      message: 'Reply sent successfully',
      messageId: result.id,
      threadId: result.threadId,
    };
  }

  async modifyEmail(userId: string, emailId: string, dto: ModifyEmailDto) {
    const provider = await this.emailProviderFactory.createProvider(userId);

    const addLabelIds: string[] = dto.addLabels || [];
    const removeLabelIds: string[] = dto.removeLabels || [];

    // Handle read/unread
    if (dto.read !== undefined) {
      if (dto.read) {
        removeLabelIds.push('UNREAD');
      } else {
        addLabelIds.push('UNREAD');
      }
    }

    // Handle starred
    if (dto.starred !== undefined) {
      if (dto.starred) {
        addLabelIds.push('STARRED');
      } else {
        removeLabelIds.push('STARRED');
      }
    }

    // Handle trash
    if (dto.trash) {
      await provider.trashEmail(emailId);
      return { message: 'Email moved to trash' };
    }

    // Modify labels
    if (addLabelIds.length > 0 || removeLabelIds.length > 0) {
      await provider.modifyEmail(
        emailId,
        addLabelIds.length > 0 ? addLabelIds : undefined,
        removeLabelIds.length > 0 ? removeLabelIds : undefined,
      );
    }

    return { message: 'Email modified successfully' };
  }

  async deleteEmail(userId: string, emailId: string) {
    const provider = await this.emailProviderFactory.createProvider(userId);

    await provider.deleteEmail(emailId);

    return { message: 'Email deleted permanently' };
  }

  async getAttachment(
    userId: string,
    messageId: string,
    attachmentId: string,
  ) {
    const provider = await this.emailProviderFactory.createProvider(userId);

    const attachment = await provider.getAttachment(messageId, attachmentId);

    return attachment;
  }

  async markAsRead(userId: string, emailId: string) {
    return this.modifyEmail(userId, emailId, { read: true });
  }

  async toggleStar(userId: string, emailId: string) {
    const provider = await this.emailProviderFactory.createProvider(userId);

    // Get current email to check if starred
    const email = await provider.getEmailById(emailId);

    const isStarred = email.labelIds?.includes('STARRED') || email.isStarred || false;

    return this.modifyEmail(userId, emailId, { starred: !isStarred });
  }

  async generateEmailSummary(
    userId: string,
    emailId: string,
    dto,
    summaryService,
  ) {
    // Fetch the email details (normalized format)
    const email = await this.getEmailById(userId, emailId);

    if (!email) {
      throw new NotFoundException('Email not found');
    }

    // Prepare email content for summarization
    const emailContent = {
      subject: email.subject || '',
      from: email.from?.email || '',
      body: email.body || email.snippet || '',
      date: email.date,
    };

    // Generate summary using the SummaryService with optional provider override
    const summary = await summaryService.generateSummary(
      emailContent,
      dto,
      dto.provider,
    );

    return {
      id: emailId,
      subject: email.subject,
      from: email.from,
      summary,
      length: dto.length,
      tone: dto.tone,
      provider: dto.provider,
    };
  }

  /**
   * Advanced search with parsed criteria
   */
  async advancedSearch(userId: string, dto: AdvancedSearchDto) {
    const criteria = this.searchQueryParser.parse(dto.query);
    const { page = 1, limit = 20, folder } = dto;
    const skip = (page - 1) * limit;

    const queryBuilder = this.emailRepository
      .createQueryBuilder('email')
      .where('email.userId = :userId', { userId });

    // Apply folder filter
    if (folder || criteria.folder) {
      queryBuilder.andWhere('UPPER(email.folder) = UPPER(:folder)', { 
        folder: criteria.folder || folder 
      });
    }

    // Apply from filter
    if (criteria.from?.length > 0) {
      const fromConditions = criteria.from.map((email, idx) => 
        `email.fromEmail ILIKE :from${idx}`
      ).join(' OR ');
      queryBuilder.andWhere(`(${fromConditions})`, 
        Object.fromEntries(criteria.from.map((email, idx) => [`from${idx}`, `%${email}%`]))
      );
    }

    // Apply to filter
    if (criteria.to?.length > 0) {
      const toConditions = criteria.to.map((email, idx) => 
        `email.toEmail::text ILIKE :to${idx}`
      ).join(' OR ');
      queryBuilder.andWhere(`(${toConditions})`, 
        Object.fromEntries(criteria.to.map((email, idx) => [`to${idx}`, `%${email}%`]))
      );
    }

    // Apply subject filter
    if (criteria.subject?.length > 0) {
      const subjectConditions = criteria.subject.map((text, idx) => 
        `email.subject ILIKE :subject${idx}`
      ).join(' AND ');
      queryBuilder.andWhere(`(${subjectConditions})`, 
        Object.fromEntries(criteria.subject.map((text, idx) => [`subject${idx}`, `%${text}%`]))
      );
    }

    // Apply contains filter (search in body and subject)
    if (criteria.contains?.length > 0) {
      const containsConditions = criteria.contains.map((text, idx) => 
        `(email.subject ILIKE :contains${idx} OR email.body ILIKE :contains${idx})`
      ).join(' AND ');
      queryBuilder.andWhere(`(${containsConditions})`, 
        Object.fromEntries(criteria.contains.map((text, idx) => [`contains${idx}`, `%${text}%`]))
      );
    }

    // Apply general search
    if (criteria.generalSearch) {
      queryBuilder.andWhere(
        '(email.subject ILIKE :search OR email.body ILIKE :search OR email.fromEmail ILIKE :search OR email.fromName ILIKE :search)',
        { search: `%${criteria.generalSearch}%` }
      );
    }

    // Apply has:attachment filter
    if (criteria.hasAttachment !== undefined) {
      if (criteria.hasAttachment) {
        queryBuilder.andWhere('email.attachments IS NOT NULL');
        queryBuilder.andWhere("jsonb_array_length(email.attachments) > 0");
      } else {
        queryBuilder.andWhere(
          '(email.attachments IS NULL OR jsonb_array_length(email.attachments) = 0)'
        );
      }
    }

    // Apply is:read/unread filter
    if (criteria.isRead !== undefined) {
      queryBuilder.andWhere('email.read = :read', { read: criteria.isRead });
    }

    // Apply is:starred filter
    if (criteria.isStarred !== undefined) {
      queryBuilder.andWhere('email.starred = :starred', { starred: criteria.isStarred });
    }

    // Get total count and paginated results
    const [emails, total] = await queryBuilder
      .orderBy('email.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      emails,
      criteria,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get sender email suggestions for autocompletion
   */
  async getSenderSuggestions(userId: string, dto: SuggestionQueryDto) {
    const { query, limit = 10 } = dto;

    const senders = await this.emailRepository
      .createQueryBuilder('email')
      .select('email.from_email', 'email')
      .addSelect('email.from_name', 'name')
      .addSelect('COUNT(*)', 'count')
      .where('email.user_id = :userId', { userId })
      .andWhere('(email.from_email ILIKE :query OR email.from_name ILIKE :query)', { 
        query: `%${query}%` 
      })
      .groupBy('email.from_email')
      .addGroupBy('email.from_name')
      .orderBy('count', 'DESC')
      .limit(limit)
      .getRawMany();

    return senders.map(s => ({
      email: s.email,
      name: s.name,
      displayText: s.name ? `${s.name} <${s.email}>` : s.email,
    }));
  }

  /**
   * Get recipient email suggestions for autocompletion
   */
  async getRecipientSuggestions(userId: string, dto: SuggestionQueryDto) {
    const { query, limit = 10 } = dto;

    // This is more complex because toEmail is an array
    const emails = await this.emailRepository
      .createQueryBuilder('email')
      .select('email.toEmail')
      .where('email.userId = :userId', { userId })
      .andWhere('email.to_email::text ILIKE :query', { query: `%${query}%` })
      .limit(100) // Get more to filter
      .getMany();

    // Flatten and deduplicate
    const recipientMap = new Map<string, number>();
    emails.forEach(email => {
      email.toEmail.forEach(recipient => {
        if (recipient.toLowerCase().includes(query.toLowerCase())) {
          recipientMap.set(recipient, (recipientMap.get(recipient) || 0) + 1);
        }
      });
    });

    // Sort by frequency and take top results
    return Array.from(recipientMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([email]) => ({
        email,
        displayText: email,
      }));
  }

  /**
   * Get subject suggestions for autocompletion
   */
  async getSubjectSuggestions(userId: string, dto: SuggestionQueryDto) {
    const { query, limit = 10 } = dto;

    const subjects = await this.emailRepository
      .createQueryBuilder('email')
      .select('email.subject', 'subject')
      .addSelect('COUNT(*)', 'count')
      .where('email.user_id = :userId', { userId })
      .andWhere('email.subject ILIKE :query', { query: `%${query}%` })
      .groupBy('email.subject')
      .orderBy('count', 'DESC')
      .limit(limit)
      .getRawMany();

    return subjects.map(s => ({
      subject: s.subject,
      displayText: s.subject,
    }));
  }
}

