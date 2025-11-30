import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    let errorResponse: any;

    // Check if this is a validation error from our validationExceptionFactory
    if (exception instanceof HttpException && this.isCustomValidationError(message)) {
      // Use the custom validation error format
      errorResponse = {
        code: status,
        message: (message as any).message || 'Invalid input data',
        errors: (message as any).errors || [],
      };
    } else {
      // Handle other types of errors
      errorResponse = {
        code: status,
        message: typeof message === 'string' ? message : (message as any).message,
        error: typeof message === 'object' ? (message as any).error : "The server encountered an error while processing your request",
      };
    }

    this.logger.error(
      `${request.method} ${request.url} - ${status} - ${JSON.stringify(errorResponse)}`,
    );

    response.status(status).json(errorResponse);
  }

  private isCustomValidationError(message: any): boolean {
    return typeof message === 'object' && message.errors && Array.isArray(message.errors);
  }
}
