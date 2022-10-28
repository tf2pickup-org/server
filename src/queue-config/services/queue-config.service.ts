import { Injectable, Inject } from '@nestjs/common';
import { QueueConfig } from '../interfaces/queue-config';
import { Validator } from 'jsonschema';
import * as queueConfigSchema from '../queue-config.schema.json'; // skipcq: JS-C1003

@Injectable()
export class QueueConfigService {
  queueConfig: QueueConfig;

  constructor(@Inject('QUEUE_CONFIG_JSON') queueConfigJson: string) {
    const config = JSON.parse(queueConfigJson);
    this.validateConfig(config);
    this.queueConfig = config as QueueConfig;
  }

  private validateConfig(config: unknown) {
    new Validator().validate(config, queueConfigSchema, { throwError: true });
  }
}
