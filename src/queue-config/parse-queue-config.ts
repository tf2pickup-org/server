import { Validator } from 'jsonschema';
import { QueueConfig } from './interfaces/queue-config';
import * as queueConfigSchema from './queue-config.schema.json'; // skipcq: JS-C1003

export const parseQueueConfig = (json: string): QueueConfig => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const config = JSON.parse(json);
  new Validator().validate(config, queueConfigSchema, { throwError: true });
  return config as QueueConfig;
};
