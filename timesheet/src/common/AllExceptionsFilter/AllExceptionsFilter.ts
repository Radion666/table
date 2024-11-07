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

    const responseBody = {
      statusCode: typedException?.status ?? httpStatus,
      timestamp: new Date().toISOString(),
      path: httpAdapter.getRequestUrl(ctx.getRequest()),
      method: ctx.getRequest()?.method, // HTTP метод (GET, POST, и т.д.)
      userAgent: ctx.getRequest()?.headers['user-agent'], // Информация о клиенте
      ip: ctx.getRequest()?.ip, // IP-адрес клиента
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
      environment: process.env.NODE_ENV || 'development',
      service: 'auth-service',
      hostname: require('os').hostname(),
      stack: exception instanceof Error ? exception.stack : '',
    };

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

    //   const ctx = host.switchToHttp();
    //   const response = ctx.getResponse<Response>();
    //   const request = ctx.getRequest<Request>();
    //   const status =
    //     exception instanceof HttpException ? exception.getStatus() : 500;
    //   const message =
    //     exception instanceof HttpException
    //       ? exception.message
    //       : 'Internal server error';
    //   // Логируем через Logger (или напрямую через Winston)
    //   this.logger.error(
    //     `[${request.method}] ${request.url} - ${message}`,
    //     exception instanceof Error ? exception.stack : '',
    //   );
    //   // Отправляем ответ клиенту
    //   response.status(status).json({
    //     statusCode: status,
    //     timestamp: new Date().toISOString(),
    //     path: request.url,
    //     message,
    //   });
    // }
  }
}
// constructor(
//   private readonly httpAdapterHost: HttpAdapterHost,
//   private readonly telegramService: TelegramService,
// ) {}

// async catch(exception: unknown, host: ArgumentsHost): Promise<void> {
//   const { httpAdapter } = this.httpAdapterHost;
//   console.log(exception);

//   const typedException = exception as {
//     response:
//       | string
//       | {
//           message: string[];
//         };
//     status: number;
//     message?: {
//       message: string;
//       error: string;
//     };
//   };

//   const ctx = host.switchToHttp();

//   const exceptionResponse =
//     exception instanceof HttpException ? exception.getResponse() : undefined;

//   const httpStatus =
//     exception instanceof HttpException
//       ? exception.getStatus()
//       : HttpStatus.INTERNAL_SERVER_ERROR;

//   const responseBody = {
//     statusCode: typedException?.status ?? httpStatus,
//     timestamp: new Date().toISOString(),
//     path: httpAdapter.getRequestUrl(ctx.getRequest()),
//     ...(typeof exceptionResponse === 'object' && exceptionResponse),
//     ...(typedException?.response && {
//       message: typedException.response,
//     }),
//   };

//   await this.telegramService.sendMessage(JSON.stringify(responseBody));

//   httpAdapter.reply(
//     ctx.getResponse(),
//     {
//       statusCode: typedException?.status ?? responseBody.statusCode,
//       message:
//         (!(typeof typedException.response === 'string')
//           ? typedException?.response?.message
//           : typedException?.message?.error
//             ? typedException?.message?.error
//             : (typedException?.message ?? '')) ?? 'Неизвестная ошибка',
//     },
//     httpStatus,
//   );
