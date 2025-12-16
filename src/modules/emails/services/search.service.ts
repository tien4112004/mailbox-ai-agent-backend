import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Email } from '../../../database/entities/email.entity';
import { FuzzySearchEmailDto } from '../dto/fuzzy-search-email.dto';

@Injectable()
export class EmailSearchService {
  private readonly logger = new Logger(EmailSearchService.name);

  constructor(private dataSource: DataSource) {}

  async fuzzySearchEmails(
    userId: string,
    searchDto: FuzzySearchEmailDto,
  ): Promise<{
    query: string;
    count: number;
    results: (Email & { similarity: number })[];
  }> {
    if (!searchDto.query || searchDto.query.trim().length === 0) {
      throw new BadRequestException('Search query cannot be empty');
    }

    const query = searchDto.query.trim();
    const limit = searchDto.limit || 20;
    const threshold = searchDto.threshold || 0.3;
    const fields = (searchDto.fields || 'subject,from_email')
      .split(',')
      .map((f) => f.trim())
      .filter((f) => ['subject', 'from_email', 'body'].includes(f));

    if (fields.length === 0) {
      throw new BadRequestException(
        'Invalid fields. Must be one or more of: subject, from_email, body',
      );
    }

    try {
      const fieldConditions = fields
        .map(
          (field) =>
            `e."${field}" % $1 AND similarity(e."${field}", $1) > $3`,
        )
        .join(' OR ');

      const similaritySelects = fields
        .map((field) => `MAX(similarity(e."${field}", $1))`)
        .join(', ');

      const sql = `
        SELECT 
          e.*,
          ${similaritySelects} as similarity
        FROM email e
        WHERE 
          e.user_id = $2
          AND (${fieldConditions})
        GROUP BY e.id
        ORDER BY similarity DESC
        LIMIT $4
      `;

      this.logger.debug(`Executing fuzzy search SQL for user ${userId} with query "${query}"`);

      const results = await this.dataSource.query(sql, [
        query,
        userId,
        threshold,
        limit,
      ]);

      this.logger.debug(
        `Fuzzy search for user ${userId} with query "${query}" returned ${results.length} results`,
      );

      if (results.length === 0) {
        this.logger.warn(
          `No emails found for user ${userId}. User may need to sync emails from Gmail first.`,
        );
      }

      return {
        query,
        count: results.length,
        results: results.map((result) => ({
          ...result,
          similarity: parseFloat(result.similarity),
        })),
      };
    } catch (error) {
      this.logger.error(
        `Fuzzy search failed for user ${userId} with query "${query}":`,
        error,
      );
      throw error;
    }
  }

  async fuzzySearchByField(
    userId: string,
    field: 'subject' | 'from_email' | 'body',
    query: string,
    limit: number = 20,
    threshold: number = 0.3,
  ): Promise<{
    field: string;
    query: string;
    count: number;
    results: (Email & { similarity: number })[];
  }> {
    if (!query || query.trim().length === 0) {
      throw new BadRequestException('Search query cannot be empty');
    }

    if (!['subject', 'from_email', 'body'].includes(field)) {
      throw new BadRequestException(
        'Invalid field. Must be one of: subject, from_email, body',
      );
    }

    try {
      const sql = `
        SELECT 
          e.*,
          similarity(e."${field}", $1) as similarity
        FROM email e
        WHERE 
          e.user_id = $2
          AND e."${field}" % $1
          AND similarity(e."${field}", $1) > $3
        ORDER BY similarity DESC
        LIMIT $4
      `;

      this.logger.debug(`Executing fuzzy search on field "${field}" for user ${userId} with query "${query}"`);

      const results = await this.dataSource.query(sql, [
        query,
        userId,
        threshold,
        limit,
      ]);

      this.logger.debug(
        `Fuzzy search on ${field} for user ${userId} with query "${query}" returned ${results.length} results`,
      );

      if (results.length === 0) {
        this.logger.warn(
          `No emails found in field "${field}" for user ${userId}. User may need to sync emails from Gmail first.`,
        );
      }

      return {
        field,
        query,
        count: results.length,
        results: results.map((result) => ({
          ...result,
          similarity: parseFloat(result.similarity),
        })),
      };
    } catch (error) {
      this.logger.error(
        `Fuzzy search on ${field} failed for user ${userId}:`,
        error,
      );
      throw error;
    }
  }
}
