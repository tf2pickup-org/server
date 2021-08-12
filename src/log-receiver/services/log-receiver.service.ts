import { Environment } from '@/environment/environment';
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { createSocket } from 'dgram';
import { Subject } from 'rxjs';
import { LogMessage } from '../types/log-message';
import { parseLogMessage } from '../utils/parse-log-message';

@Injectable()
export class LogReceiverService implements OnModuleDestroy {
  private logger = new Logger(LogReceiverService.name);
  private socket = createSocket('udp4');
  private _data = new Subject<LogMessage>();

  constructor(private environment: Environment) {
    this.socket.on('message', (message) => {
      try {
        const logMessage = parseLogMessage(message);
        this._data.next(logMessage);
      } catch (error) {
        this.logger.debug(error.message);
      }
    });

    this.socket.on('listening', () => {
      const address = this.socket.address();
      this.logger.log(
        `log receiver listening at ${address.address}:${address.port}`,
      );
    });

    this.socket.bind(parseInt(this.environment.logRelayPort, 10), '0.0.0.0');
  }

  get data() {
    return this._data.asObservable();
  }

  async onModuleDestroy() {
    await new Promise<void>((resolve) => this.socket.close(resolve));
    this.logger.debug('log receiver closed');
  }
}
