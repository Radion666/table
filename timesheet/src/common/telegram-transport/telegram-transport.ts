import axios from 'axios';
import TransportStream from 'winston-transport';

interface TelegramTransportOptions {
  token: string;
  chatId: string;
  level?: string;
}

export class TelegramTransport extends TransportStream {
  private token: string;
  private chatId: string;

  constructor(options: TelegramTransportOptions) {
    super(options);
    this.token = options.token;
    this.chatId = options.chatId;
  }

  async log(info: any, callback: () => void) {
    if (info.level === 'info') {
      return callback();
    }

    const message = `[${info.level.toUpperCase()}] ${info.message}`;

    try {
      await axios.post(
        `https://api.telegram.org/bot${this.token}/sendMessage`,
        {
          chat_id: this.chatId,
          text: message,
        },
      );
    } catch (error) {
      console.error('Ошибка при отправке в Telegram:', error.message);
    }

    callback();
  }
}
