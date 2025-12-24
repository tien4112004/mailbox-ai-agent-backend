import { Injectable, Logger, BadRequestException, HttpException, HttpStatus, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Email } from '../../../database/entities/email.entity';
import { GeminiClient } from '../providers/gemini.client';
// Search parameters (limit, fields, threshold, enableSemantic) are read from configuration/env

@Injectable()
export class EmailSearchService implements OnModuleInit {
  private readonly logger = new Logger(EmailSearchService.name);

  constructor(private dataSource: DataSource, private configService: ConfigService) {}

  private semanticAvailable = false;
  private geminiClient?: GeminiClient;

  async onModuleInit(): Promise<void> {
    // Initialize Gemini client and check availability at startup so we can disable semantic search if model/key is invalid
    const key = this.geminiApiKey;
    const model = this.geminiModel;
    if (!key) {
      this.logger.warn('Gemini API key not configured; disabling semantic search');
      this.semanticAvailable = false;
      return;
    }

    this.geminiClient = new GeminiClient(key, model);
    try {
      this.semanticAvailable = await this.geminiClient.checkModelAvailability();
    } catch (err) {
      this.logger.warn('Gemini model availability check failed: ' + (err as Error).message);
      // If a key exists we will optimistically enable semantic search and attempt to index embeddings in background.
      // This allows transient availability or model naming mismatches to be handled at runtime when embedding calls are made.
      this.semanticAvailable = Boolean(key);
      if (this.semanticAvailable) {
        this.logger.warn('Forcing semanticAvailable=true because GEMINI_API_KEY is present. Failed model checks may still disable semantic search at runtime.');
      }
    }

    // If semantic search is enabled (either via successful check or forced), start background indexing of missing embeddings
    if (this.defaultEnableSemantic && this.semanticAvailable) {
      // run in background, do not block startup
      this.indexAllMissingEmbeddingsInBackground().catch((err) => {
        this.logger.warn('Background embedding indexing failed to start: ' + (err as Error).message);
      });
    }
  }

  /**
   * Find all users with emails missing embeddings and kick off indexing for each.
   * Runs in background and logs progress.
   */
  private async indexAllMissingEmbeddingsInBackground(): Promise<void> {
    try {
      this.logger.log('Starting background job to index missing embeddings for users');
      const rows: Array<{ user_id: string }> = await this.dataSource.query(
        `SELECT DISTINCT user_id FROM emails WHERE embedding IS NULL`,
      );

      if (!rows || rows.length === 0) {
        this.logger.log('No missing embeddings found at startup');
        return;
      }

      for (const r of rows) {
        const userId = r.user_id;
        // Fire-and-forget per user but await sequentially to avoid overwhelming the API
        try {
          const count = await this.indexMissingEmbeddings(userId, 100);
          this.logger.log(`Indexed up to ${count} missing embeddings for user ${userId}`);
        } catch (err) {
          this.logger.warn(`Failed to index embeddings for user ${userId}: ${(err as Error).message}`);
        }
      }

      this.logger.log('Background embedding indexing job completed');
    } catch (err) {
      this.logger.warn('Error while starting background embedding indexing: ' + (err as Error).message);
    }
  }

  private async checkGeminiModelAvailability(): Promise<boolean> {
    // Keep compatibility - use the instantiated client if available
    const key = this.geminiApiKey;
    const model = this.geminiModel;
    if (!key) {
      this.logger.warn('Gemini API key not configured; disabling semantic search');
      this.semanticAvailable = false;
      return false;
    }

    if (!this.geminiClient) {
      this.geminiClient = new GeminiClient(key, model);
    }

    try {
      const available = await this.geminiClient.checkModelAvailability();
      this.semanticAvailable = Boolean(available);
      return available;
    } catch (err) {
      this.logger.warn('Failed to check Gemini model availability: ' + (err as Error).message);
      this.semanticAvailable = false;
      return false;
    }
  }

  // OpenAI removed for embeddings; only Gemini (Google) is used for embeddings

  private get geminiApiKey(): string {
    return (
      this.configService.get<string>('app.gemini.apiKey') || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || ''
    );
  }

  private get geminiModel(): string {
    // Hardcoded model selection to balance cost and performance. Change here when you want to switch models.
    return 'gemini-embedding-001';
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    // Use Gemini (Google) embeddings only
    const geminiKey = this.geminiApiKey;
    if (!geminiKey) {
      throw new HttpException(
        'Gemini API key is not configured. Set GEMINI_API_KEY or GOOGLE_API_KEY',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    if (!this.geminiClient) {
      this.geminiClient = new GeminiClient(geminiKey, this.geminiModel);
    }

    try {
      const emb = await this.geminiClient.embed(text);
      return emb;
    } catch (error) {
      // If model not found (404) or similar, disable semantic search to avoid repeated failures
      const errMsg = (error as Error).message || '';
      if (errMsg.includes('Requested entity was not found') || errMsg.includes('404')) {
        this.logger.warn(`Gemini model ${this.geminiModel} not found or inaccessible; disabling semantic search`);
        this.semanticAvailable = false;
      }
      this.logger.error('Error generating embedding with Gemini:', error as any);
      throw new HttpException(
        'Failed to generate embedding from Gemini provider: ' + (error as Error).message,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Index a single email's embedding (subject + body)
   */
  async indexEmailEmbedding(emailId: string): Promise<void> {
    const rows = await this.dataSource.query('SELECT id, subject, body FROM emails WHERE id = $1', [emailId]);
    if (!rows || rows.length === 0) return;

    const email = rows[0];
    const text = `${email.subject || ''}\n\n${email.body || ''}`;
    const embedding = await this.generateEmbedding(text);

    const vectorParam = '[' + embedding.join(',') + ']';

    await this.dataSource.query(
      'UPDATE emails SET embedding = $1::vector WHERE id = $2',
      [vectorParam, emailId],
    );
  }

  async indexMissingEmbeddings(userId: string, batchSize = 50): Promise<number> {
    // find emails for user with null embedding
    const rows = await this.dataSource.query(
      'SELECT id, subject, body FROM emails WHERE user_id = $1 AND embedding IS NULL ORDER BY created_at DESC LIMIT $2',
      [userId, batchSize],
    );

    for (const r of rows) {
      try {
        await this.indexEmailEmbedding(r.id);
      } catch (err) {
        this.logger.warn(`Failed to index embedding for email ${r.id}: ${(err as Error).message}`);
      }
    }

    return rows.length;
  }

  async semanticSearch(
    userId: string,
    queryText: string,
    limit = 10,
  ): Promise<{ query: string; count: number; results: (Email & { similarity: number })[] }> {
    if (!queryText || queryText.trim().length === 0) {
      throw new BadRequestException('Search query cannot be empty');
    }

    // ensure embeddings for query and perform vector search
    const queryEmbedding = await this.generateEmbedding(queryText);
    const param = '[' + queryEmbedding.join(',') + ']';

    // Ensure we only search emails with embeddings
    const sql = `
      SELECT
        e.*,
        (1 - (e.embedding <=> $1::vector)) as similarity
      FROM emails e
      WHERE e.user_id = $2 AND e.embedding IS NOT NULL
      ORDER BY e.embedding <=> $1::vector
      LIMIT $3
    `;

    const results = await this.dataSource.query(sql, [param, userId, limit]);

    return {
      query: queryText,
      count: results.length,
      results: results.map((r) => ({ ...r, similarity: parseFloat(r.similarity) })),
    };
  }

  /**
   * Combined search that applies fuzzy/trigram/substring and semantic strategies and merges results.
   */
  private get defaultFields(): string[] {
    const raw = this.configService.get<string>('search.fields') || process.env.SEARCH_DEFAULT_FIELDS || 'subject,from_email';
    return raw
      .split(',')
      .map((f) => f.trim())
      .filter((f) => ['subject', 'from_email', 'body'].includes(f));
  }

  private get defaultLimit(): number {
    const v = this.configService.get<number>('search.limit') || parseInt(process.env.SEARCH_DEFAULT_LIMIT || '20', 10);
    return isNaN(v) ? 20 : v;
  }

  private get defaultThreshold(): number {
    const v = this.configService.get<number>('search.threshold') || parseFloat(process.env.SEARCH_THRESHOLD || '0.3');
    return isNaN(v) ? 0.3 : v;
  }

  private get defaultEnableSemantic(): boolean {
    const raw = this.configService.get<any>('search.enableSemantic') ?? process.env.SEARCH_ENABLE_SEMANTIC;
    if (raw === undefined || raw === null) return true;
    if (typeof raw === 'string') return raw === 'true' || raw === '1';
    // Only enable semantic if configuration allows AND Gemini model/key is available
    return Boolean(raw) && this.semanticAvailable;
  }

  async combinedSearch(
    userId: string,
    queryText: string,
    limitOverride?: number,
  ): Promise<{ query: string; count: number; results: (Email & { similarity: number; sources: string[] })[] }> {
    const query = queryText?.trim();
    if (!query) throw new BadRequestException('Search query cannot be empty');

    const limit = limitOverride || this.defaultLimit;
    const fields = this.defaultFields;
    const threshold = this.defaultThreshold;
    const enableSemantic = this.defaultEnableSemantic;

    // container to merge results
    const merged = new Map<string, any>();

    // 1) Run fuzzy search (existing implementation) - try/catch to continue on error
    try {
      const fuzzyRes = await this.fuzzySearchEmails(userId, { query, limit, fields: fields.join(','), threshold } as any);
      for (const r of fuzzyRes.results) {
        merged.set(r.id, { ...r, similarity: r.similarity, sources: ['fuzzy'] });
      }
    } catch (err) {
      this.logger.warn(`Fuzzy search failed: ${(err as Error).message}`);
    }

    // 2) Try trigram-like search via fuzzySearchByField per field (to get higher similarity values)
    try {
      for (const field of fields) {
        try {
          const fieldRes = await this.fuzzySearchByField(userId, field as any, query, limit, threshold || 0.3);
          for (const r of fieldRes.results) {
            const existing = merged.get(r.id);
            if (existing) {
              existing.similarity = Math.max(existing.similarity, r.similarity);
              if (!existing.sources.includes('trigram')) existing.sources.push('trigram');
              merged.set(r.id, existing);
            } else {
              merged.set(r.id, { ...r, similarity: r.similarity, sources: ['trigram'] });
            }
          }
        } catch (err) {
          // ignore single-field failures
          this.logger.debug(`Trigram search failed for field ${field}: ${(err as Error).message}`);
        }
      }
    } catch (err) {
      this.logger.warn(`Trigram searches failed: ${(err as Error).message}`);
    }

    // 3) Semantic search (if enabled and embeddings available)
    if (enableSemantic) {
      try {
        const semRes = await this.semanticSearch(userId, query, limit * 2);
        for (const r of semRes.results) {
          const existing = merged.get(r.id);
          const semSim = r.similarity || 0;
          if (existing) {
            // weight semantic a bit higher when merging
            existing.similarity = Math.max(existing.similarity, semSim * 1.1);
            if (!existing.sources.includes('semantic')) existing.sources.push('semantic');
            merged.set(r.id, existing);
          } else {
            merged.set(r.id, { ...r, similarity: semSim, sources: ['semantic'] });
          }
        }
      } catch (err) {
        this.logger.warn(`Semantic search failed or disabled: ${(err as Error).message}`);
      }
    }

    // Convert merged to array, sort by similarity desc then createdAt desc
    const resultsArr = Array.from(merged.values())
      .sort((a, b) => {
        if (b.similarity === a.similarity) {
          // newest first
          return new Date(b.created_at || b.createdAt).getTime() - new Date(a.created_at || a.createdAt).getTime();
        }
        return b.similarity - a.similarity;
      })
      .slice(0, limit)
      .map((r) => ({ ...r, similarity: parseFloat(r.similarity) }));

    return {
      query,
      count: resultsArr.length,
      results: resultsArr,
    };
  }

  async fuzzySearchEmails(
    userId: string,
    params: { query: string; limit?: number; fields?: string; threshold?: number },
  ): Promise<{
    query: string;
    count: number;
    results: (Email & { similarity: number })[];
  }> {
    if (!params.query || params.query.trim().length === 0) {
      throw new BadRequestException('Search query cannot be empty');
    }

    const query = params.query.trim();
    const limit = params.limit || this.defaultLimit;
    const threshold = params.threshold ?? 0.1; // Lowered threshold for better fuzzy matching
    const fields = (params.fields || this.defaultFields.join(','))
      .split(',')
      .map((f) => f.trim())
      .filter((f) => ['subject', 'from_email', 'body'].includes(f));

    if (fields.length === 0) {
      throw new BadRequestException(
        'Invalid fields. Must be one or more of: subject, from_email, body',
      );
    }

    try {
      // First check if user has any emails
      const emailCountResult = await this.dataSource.query(
        'SELECT COUNT(*)::int as count FROM emails WHERE user_id = $1',
        [userId],
      );
      const emailCount = emailCountResult[0]?.count || 0;
      this.logger.debug(`User ${userId} has ${emailCount} total emails`);

      let results = [];
      if (emailCount > 0) {
        // Avoid logging the raw user query text to prevent leaking sensitive search terms
        this.logger.debug(`Executing primary substring + word-level Levenshtein search for user ${userId}`);

        const maxDistance = query.length <= 3 ? 2 : 3;

        // Build OR conditions for substring matching + word-level Levenshtein
        const wordMatchConditions = fields
          .map(
            (field) =>
              `(
                LOWER(e."${field}") LIKE LOWER('%' || $1::text || '%')
                OR EXISTS (
                  SELECT 1 FROM (
                    SELECT levenshtein($1::text, word) as dist
                    FROM regexp_split_to_table(LOWER(e."${field}"), '[^a-z0-9]+') AS word
                    WHERE length(word) > 0
                  ) matches
                  WHERE matches.dist <= $3
                )
              )`,
          )
          .join(' OR ');

        const levenshteinSql = `
          SELECT 
            e.*,
            0.5 as similarity
          FROM emails e
          WHERE 
            e.user_id = $2
            AND (${wordMatchConditions})
          ORDER BY e.created_at DESC
          LIMIT $4
        `;

        try {
          results = await this.dataSource.query(levenshteinSql, [
            query,
            userId,
            maxDistance,
            limit,
          ]);

          this.logger.debug(
            `Word-level Levenshtein search for user ${userId} returned ${results.length} results`,
          );
        } catch (error) {
          this.logger.warn(
            `Word-level search failed, falling back to simple substring: ${error.message}`,
          );
          // Fallback to simple substring search
          const fallbackConditions = fields
            .map((field) => `LOWER(e."${field}") LIKE LOWER('%' || $1::text || '%')`)
            .join(' OR ');

          const fallbackSql = `
            SELECT 
              e.*,
              0.5 as similarity
            FROM emails e
            WHERE 
              e.user_id = $2
              AND (${fallbackConditions})
            ORDER BY e.created_at DESC
            LIMIT $3
          `;

          results = await this.dataSource.query(fallbackSql, [
            query,
            userId,
            limit,
          ]);

          this.logger.debug(
            `Fallback substring search returned ${results.length} results`,
          );
        }
      }

      // Fallback 1: Trigram similarity (if Levenshtein not available or returns 0)
      if (results.length === 0 && emailCount > 0) {
        this.logger.debug(
          `Levenshtein unavailable/empty. Trying trigram similarity search for user ${userId}`,
        );

        const fieldConditions = fields
          .map(
            (field) =>
              `e."${field}"::text % $1::text AND similarity(e."${field}"::text, $1::text) > $3`,
          )
          .join(' OR ');

        const similarityCase = fields
          .map((field) => `similarity(e."${field}"::text, $1::text)`)
          .join(', ');

        const sql = `
          SELECT 
            e.*,
            GREATEST(${similarityCase}) as similarity
          FROM emails e
          WHERE 
            e.user_id = $2
            AND (${fieldConditions})
          ORDER BY similarity DESC
          LIMIT $4
        `;

  // Do not include raw query text in logs
  this.logger.debug(`Executing trigram search SQL for user ${userId}`);

        results = await this.dataSource.query(sql, [
          query,
          userId,
          threshold,
          limit,
        ]);

        this.logger.debug(
          `Trigram search for user ${userId} returned ${results.length} results`,
        );
      }

      // Fallback 2: Substring LIKE match (if trigram also returns 0)
      if (results.length === 0 && emailCount > 0) {
        this.logger.debug(
          `Trigram search returned 0 results. Trying fallback substring LIKE search for user ${userId}`,
        );

        const fallbackConditions = fields
          .map((field) => `LOWER(e."${field}") LIKE LOWER($1)`)
          .join(' OR ');

        const fallbackSql = `
          SELECT 
            e.*,
            0.5 as similarity
          FROM emails e
          WHERE 
            e.user_id = $2
            AND (${fallbackConditions})
          LIMIT $3
        `;

        results = await this.dataSource.query(fallbackSql, [
          `%${query}%`,
          userId,
          limit,
        ]);

        this.logger.debug(
          `Substring LIKE search for user ${userId} returned ${results.length} results`,
        );
      }

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
         similarity(e."${field}"::text, $1::text) as similarity
        FROM emails e
        WHERE 
          e.user_id = $2
         AND e."${field}"::text % $1::text
         AND similarity(e."${field}"::text, $1::text) > $3
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
