import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { AppModule } from './app.module';
import { TelegramTransport } from './common/telegram-transport/telegram-transport';

async function bootstrap() {
  const PORT = process.env.PORT || 5000;

  const app = await NestFactory.create(AppModule, {
    cors: true,
    logger: WinstonModule.createLogger({
      transports: [
        new winston.transports.Console(),
        new TelegramTransport({
          token: process.env.TG_API_TOKEN,
          chatId: process.env.TG_CHAT_ID,
          level: 'debug',
        }),
      ],
    }),
  });

  app.setGlobalPrefix('/api/v1');
  app.useGlobalPipes(new ValidationPipe());

  const config = new DocumentBuilder()
    .addBearerAuth()
    .setTitle('Timesheet swagger')
    .setDescription('Timesheet swagger')
    .setVersion('1.0.0')
    .addTag('swager of timesheet')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('/api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  await app.listen(PORT, () => {
    console.log(`Server started at port - ${PORT}`);
  });
}
bootstrap();
