import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';

@Catch() // Ловим все исключения
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  private readonly logger = new Logger(AllExceptionsFilter.name); // Используем NestJS Logger

  async catch(exception: unknown, host: ArgumentsHost) {
    const { httpAdapter } = this.httpAdapterHost;

    const typedException = exception as {
      response:
        | string
        | {
            message: string[];
          };
      status: number;
      message?: {
        message: string;
        error: string;
      };
    };

    const ctx = host.switchToHttp();

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : undefined;
    const exceptionRequest = ctx.getRequest();

    const httpStatus =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const responseBody: any = {
      statusCode: typedException?.status ?? httpStatus,
      timestamp: new Date().toISOString(),
      path: httpAdapter.getRequestUrl(ctx.getRequest()),
      method: ctx.getRequest()?.method,
      userAgent: ctx.getRequest()?.headers['user-agent'],
      ip: ctx.getRequest()?.ip,
      ...(typeof exceptionResponse === 'object' && exceptionResponse),
      ...(typedException?.response && {
        message: typedException.response,
      }),
      ...(exceptionRequest?.body && {
        requestBody: JSON.stringify(exceptionRequest?.body),
      }),
      ...(exceptionRequest?.params && {
        requestParams: JSON.stringify(exceptionRequest?.params),
      }),
      ...(exceptionRequest?.query && {
        requestQuery: JSON.stringify(exceptionRequest.query),
      }),
    };

    // Only include sensitive info in development
    if (process.env.NODE_ENV !== 'production') {
      responseBody.environment = process.env.NODE_ENV || 'development';
      responseBody.service = 'timesheet-service';
      responseBody.hostname = require('os').hostname();
      responseBody.stack = exception instanceof Error ? exception.stack : '';
    }

    this.logger.error(
      `\`\`\`\n${JSON.stringify(responseBody, null, 2)}\n\`\`\``,
      exception instanceof Error ? `\`\`\`\n${exception.stack}\n\`\`\`` : '',
    );

    httpAdapter.reply(
      ctx.getResponse(),
      {
        statusCode: typedException?.status ?? responseBody.statusCode,
        message:
          (!(typeof typedException.response === 'string')
            ? typedException?.response?.message
            : typedException?.message?.error
              ? typedException?.message?.error
              : (typedException?.message ?? '')) ?? 'Неизвестная ошибка',
      },
      httpStatus,
    );
  }
}
