import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
  PipeTransform,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import type { ZodType } from 'zod';

/** Standard error envelope: {code, message, field_errors, request_id} (master-architecture §7). */
export class ApiError extends HttpException {
  constructor(status: HttpStatus, code: string, message: string, fieldErrors?: Record<string, string>) {
    super({ code, message, field_errors: fieldErrors ?? {} }, status);
  }
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('HTTP');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request & { requestId?: string }>();
    const requestId = req.requestId ?? randomUUID();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      const payload =
        typeof body === 'object' && body !== null && 'code' in body
          ? body
          : {
              code: defaultCode(status),
              message: typeof body === 'string' ? body : exception.message,
              field_errors: {},
            };
      res.status(status).json({ ...payload, request_id: requestId });
      return;
    }

    this.logger.error(`Unhandled error request_id=${requestId}`, exception as Error);
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'Something went wrong. Please try again.',
      field_errors: {},
      request_id: requestId,
    });
  }
}

function defaultCode(status: number): string {
  switch (status) {
    case 400: return 'BAD_REQUEST';
    case 401: return 'UNAUTHENTICATED';
    case 403: return 'FORBIDDEN';
    case 404: return 'NOT_FOUND';
    case 409: return 'CONFLICT';
    case 429: return 'TOO_MANY_REQUESTS';
    default: return 'ERROR';
  }
}

/** Validates a request body against a zod schema and returns field errors in the standard shape. */
export class ZodBody<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodType<T>) {}
  transform(value: unknown): T {
    const result = this.schema.safeParse(value);
    if (result.success) return result.data;
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      fieldErrors[issue.path.join('.') || '_'] ??= issue.message;
    }
    throw new BadRequestException({
      code: 'VALIDATION_FAILED',
      message: 'Please check the highlighted fields.',
      field_errors: fieldErrors,
    });
  }
}
