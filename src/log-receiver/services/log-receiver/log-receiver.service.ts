import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { LogReceiver } from 'srcds-log-receiver';

@Injectable()
export class LogReceiverService implements OnModuleDestroy {

  private logger = new Logger(LogReceiverService.name);

  constructor(
    private logReceiver: LogReceiver,
  ) { }

  async onModuleDestroy() {
    await new Promise<void>(resolve => this.logReceiver.socket.close(resolve));
    this.logger.debug('LogReceiver closed');
  }

}
