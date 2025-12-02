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
    const jsonStr = JSON.stringify(data);
    
    // If it's an array with more than 5 items, show count
    if (Array.isArray(data) && data.length > 5) {
      return `[Array with ${data.length} elements] First 3: ${JSON.stringify(data.slice(0, 3))}...`;
    }
    
    // If the response has a data.emails array with more than 5 items
    if (data?.data?.emails && Array.isArray(data.data.emails) && data.data.emails.length > 5) {
      return JSON.stringify({
        ...data,
        data: {
          ...data.data,
          emails: `[${data.data.emails.length} emails] First 3: ${JSON.stringify(data.data.emails.slice(0, 3))}...`,
        },
      });
    }
    
    // If string is too long, truncate
    if (jsonStr.length > maxLength) {
      return `${jsonStr.substring(0, maxLength)}... (${jsonStr.length - maxLength} more characters, total: ${jsonStr.length})`;
    }
    
    return jsonStr;
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const { method, url, body, query, headers } = request;
    const now = Date.now();

    // Log incoming request
    this.logger.log(`
========== INCOMING REQUEST ==========
Method: ${method}
URL: ${url}
Query: ${this.truncateData(query, 200)}
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
