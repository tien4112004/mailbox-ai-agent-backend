import {
  BadRequestException,
  ValidationError,
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

// Helper function to convert camelCase to snake_case
function camelToSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function extractValidationErrors(
  errors: ValidationError[],
  parentPath: string = '',
): any[] {
  const result: any[] = [];

  for (const err of errors) {
    const fieldName = parentPath
      ? `${parentPath}.${camelToSnakeCase(err.property)}`
      : camelToSnakeCase(err.property);
    if (err.constraints) {
      const firstKey = Object.keys(err.constraints)[0];
      const context = err.contexts?.[firstKey] || null;

      result.push({
        field: fieldName,
        error_code: context?.error_code || 'VALIDATION_ERROR',
        message: context?.message || err.constraints[firstKey],
        details: context?.details || err.constraints[firstKey],
      });
    }

    if (err.children && err.children.length > 0) {
      result.push(...extractValidationErrors(err.children, fieldName));
    }
  }

  return result;
}

export const validationExceptionFactory = (
  validationErrors: ValidationError[] = [],
) => {
  const errors = extractValidationErrors(validationErrors);

  return new BadRequestException({
    code: 400,
    message: 'Invalid input data',
    errors,
  });
};

@Catch(BadRequestException)
export class ValidationExceptionFilter implements ExceptionFilter {
  catch(exception: BadRequestException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const res: any = exception.getResponse();

    // Check if this is a validation error with our custom format
    if (res.errors && Array.isArray(res.errors)) {
      // This is our custom validation error, return it as is
      response.status(HttpStatus.BAD_REQUEST).json({
        code: res.code || HttpStatus.BAD_REQUEST,
        message: res.message || 'Invalid input data',
        errors: res.errors,
      });
    } else {
      // Let it pass to the next filter
      throw exception;
    }
  }
}
