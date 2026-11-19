import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { ApiError } from '@ks/shared-types';
import type { Request, Response } from 'express';

/** Formato de error uniforme. Nunca expone stack traces al cliente. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exceptions');

  catch(exception: unknown, host: ArgumentsHost): void {
    if (host.getType() !== 'http') return;
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request & { id?: string }>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Error interno del servidor';
    let details: unknown;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') message = body;
      else {
        const b = body as { message?: string | string[]; details?: unknown };
        message = Array.isArray(b.message)
          ? b.message.join(', ')
          : (b.message ?? exception.message);
        details = b.details;
      }
    } else {
      this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    }

    const payload: ApiError = {
      statusCode: status,
      error: HttpStatus[status] ?? 'Error',
      message,
      details,
      requestId: req.id ? String(req.id) : undefined,
    };
    res.status(status).json(payload);
  }
}
