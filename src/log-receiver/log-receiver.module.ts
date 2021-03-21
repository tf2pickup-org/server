import { Environment } from '@/environment/environment';
import { Module } from '@nestjs/common';
import { LogReceiver } from 'srcds-log-receiver';

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
  ],
  exports: [
    logReceiverProvider,
  ],
})
export class LogReceiverModule {}
