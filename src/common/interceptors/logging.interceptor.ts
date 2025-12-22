import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  private truncateData(data: any, maxLength: number = 500): string {
    const MAX_ITEM_PREVIEW = 3;
    const MAX_STRING_FIELD = 200;

    function truncateString(s: string, max = MAX_STRING_FIELD) {
      if (s.length <= max) return s;
      return `${s.substring(0, max)}... (${s.length - max} more chars)`;
    }

    function sanitizeObject(obj: any): any {
      if (obj === null || obj === undefined) return obj;
      if (typeof obj === 'string') return truncateString(obj);
      if (typeof obj === 'number' || typeof obj === 'boolean') return obj;
      if (Array.isArray(obj)) {
        const len = obj.length;
        const preview = obj.slice(0, MAX_ITEM_PREVIEW).map((it) => sanitizeObject(it));
        return `[Array with ${len} elements] First ${Math.min(len, MAX_ITEM_PREVIEW)}: ${preview}`;
      }
      // Plain object
      const out: any = {};
      for (const k of Object.keys(obj)) {
        const v = obj[k];
        // For large textual fields use aggressive truncation
        if (typeof v === 'string' && ['body', 'htmlBody', 'textBody', 'snippet'].includes(k)) {
          out[k] = truncateString(v, 120);
        } else if (typeof v === 'string') {
          out[k] = truncateString(v);
        } else if (Array.isArray(v)) {
          out[k] = Array.isArray(v) && v.length > MAX_ITEM_PREVIEW ? `[Array with ${v.length} elements] First ${Math.min(v.length, MAX_ITEM_PREVIEW)}: ${JSON.stringify(v.slice(0, MAX_ITEM_PREVIEW).map(sanitizeObject))}...` : v.map(sanitizeObject);
        } else if (typeof v === 'object' && v !== null) {
          // shallow sanitize nested objects
          out[k] = sanitizeObject(v);
        } else {
          out[k] = v;
        }
      }
      return out;
    }

    try {
      // Special handling: arrays of entities (emails)
      if (Array.isArray(data) && data.length > 5) {
        const preview = data.slice(0, MAX_ITEM_PREVIEW).map((it) => sanitizeObject(it));
        const s = `[Array with ${data.length} elements] First ${Math.min(data.length, MAX_ITEM_PREVIEW)}: ${JSON.stringify(preview)}...`;
        return s.length > maxLength ? s.substring(0, maxLength) + '...' : s;
      }

      // If the response has a data.emails array
      if (data?.data?.emails && Array.isArray(data.data.emails) && data.data.emails.length > 5) {
        const sanitized = sanitizeObject({
          ...data,
          data: {
            ...data.data,
            emails: `[${data.data.emails.length} emails] First 3: ${JSON.stringify((data.data.emails || []).slice(0, MAX_ITEM_PREVIEW).map(sanitizeObject))}...`,
          },
        });
        const s = JSON.stringify(sanitized);
        return s.length > maxLength ? s.substring(0, maxLength) + '...' : s;
      }

      // Generic stringify with truncation for very long values
      const jsonStr = JSON.stringify(sanitizeObject(data));
      if (jsonStr.length > maxLength) {
        return `${jsonStr.substring(0, maxLength)}... (${jsonStr.length - maxLength} more characters, total: ${jsonStr.length})`;
      }
      return jsonStr;
    } catch (e) {
      // Fallback to safe string
      const s = String(data);
      if (s.length > maxLength) return `${s.substring(0, maxLength)}... (${s.length - maxLength} more characters, total: ${s.length})`;
      return s;
    }
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const { method, url, body, query, headers } = request;
    // Redact potentially sensitive query parameters (e.g., search terms)
    const safeQuery = { ...query };
    if (safeQuery && typeof safeQuery.query === 'string') {
      safeQuery.query = '[REDACTED]';
    }
    const now = Date.now();

    // Log incoming request
  this.logger.log(`
========== INCOMING REQUEST ==========
Method: ${method}
URL: ${url}
Query: ${this.truncateData(safeQuery, 200)}
Headers: ${JSON.stringify({
      'content-type': headers['content-type'],
      'user-agent': headers['user-agent'],
      authorization: headers['authorization'] ? 'Bearer ***' : undefined,
    })}
Body: ${this.truncateData(body, 300)}
======================================
    `);

    return next.handle().pipe(
      tap({
        next: (data) => {
          // Skip logging if response is already sent (e.g., redirect)
          if (response.headersSent) {
            const responseTime = Date.now() - now;
            this.logger.log(`
========== OUTGOING RESPONSE ==========
Method: ${method}
URL: ${url}
Status: ${response.statusCode}
Response Time: ${responseTime}ms
Body: [Redirect response - headers already sent]
=======================================
            `);
            return;
          }

          const { statusCode } = response;
          const responseTime = Date.now() - now;

          // Log outgoing response
          this.logger.log(`
========== OUTGOING RESPONSE ==========
Method: ${method}
URL: ${url}
Status: ${statusCode}
Response Time: ${responseTime}ms
Body: ${this.truncateData(data, 500)}
=======================================
          `);
        },
        error: (error) => {
          const responseTime = Date.now() - now;
          this.logger.error(`
========== ERROR RESPONSE ==========
Method: ${method}
URL: ${url}
Response Time: ${responseTime}ms
Error: ${error.message}
Stack: ${error.stack}
====================================
          `);
        },
      }),
    );
  }
}
