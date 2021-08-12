import { Module } from '@nestjs/common';
import { LogReceiverService } from './services/log-receiver.service';

@Module({
  providers: [LogReceiverService],
  exports: [LogReceiverService],
})
export class LogReceiverModule {}
