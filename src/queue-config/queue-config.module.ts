import { Environment } from '@/environment/environment';
import { Module } from '@nestjs/common';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { QueueConfigService } from './services/queue-config.service';

@Module({
  providers: [
    QueueConfigService,
    {
      provide: 'QUEUE_CONFIG_JSON',
      useFactory: async (environment: Environment) => {
        const configFileName = join(
          'configs',
          'queue',
          `${environment.queueConfig}.json`,
        );
        return await readFile(configFileName, 'utf-8');
      },
      inject: [Environment],
    },
  ],
  exports: [QueueConfigService],
})
export class QueueConfigModule {}
