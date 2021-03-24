import { Environment } from '@/environment/environment';
import { Module } from '@nestjs/common';
import { LogReceiver } from 'srcds-log-receiver';
import { LogReceiverService } from './services/log-receiver/log-receiver.service';

const logReceiverProvider = {
  provide: LogReceiver,
  useFactory: (environment: Environment) => new LogReceiver({
    port: parseInt(environment.logRelayPort, 10),
  }),
  inject: [ Environment ],
};

@Module({
  providers: [
    logReceiverProvider,
    LogReceiverService,
  ],
  exports: [
    logReceiverProvider,
  ],
})
export class LogReceiverModule {}
