import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);
  private readonly telegramToken = process.env.TG_API_TOKEN;
  private readonly chatId = process.env.TG_CHAT_ID;

  async sendMessage(message: string) {
    const url = `https://api.telegram.org/bot${this.telegramToken}/sendMessage`;

    try {
      await axios.post(url, {
        chat_id: this.chatId,
        text: `${message}`,
      });
      this.logger.log(`Message sent to Telegram: ${message}`);
    } catch (error) {
      this.logger.error(`Failed to send message to Telegram: ${error.message}`);
    }
  }
}
