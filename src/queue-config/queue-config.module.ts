import { Environment } from '@/environment/environment';
import { Module, Provider } from '@nestjs/common';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { parseQueueConfig } from './parse-queue-config';

const queueConfigJsonProvider: Provider = {
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
};

const queueConfigProvider: Provider = {
  provide: 'QUEUE_CONFIG',
  useFactory: (json: string) => parseQueueConfig(json),
  inject: ['QUEUE_CONFIG_JSON'],
};

@Module({
  providers: [queueConfigJsonProvider, queueConfigProvider],
  exports: [queueConfigProvider],
})
export class QueueConfigModule {}
