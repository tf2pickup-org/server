import { Injectable, Logger, Inject } from '@nestjs/common';
import { QueueConfig } from '../queue-config';
import { Validator } from 'jsonschema';
import * as queueConfigSchema from '../queue-config.schema.json';

@Injectable()
export class QueueConfigService {
  queueConfig: QueueConfig;

  private readonly logger = new Logger(QueueConfigService.name);

  constructor(@Inject('QUEUE_CONFIG_JSON') queueConfigJson: string) {
    const config = JSON.parse(queueConfigJson);
    this.validateConfig(config);
    this.queueConfig = config as QueueConfig;
  }

  private validateConfig(config: any) {
    new Validator().validate(config, queueConfigSchema, { throwError: true });
  }
}
