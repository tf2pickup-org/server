import { Module } from '@nestjs/common';
import { QueueConfigService } from './services/queue-config.service';

@Module({
  providers: [QueueConfigService],
  exports: [QueueConfigService],
})
export class QueueConfigModule {}
