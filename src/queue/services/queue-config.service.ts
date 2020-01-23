import { Injectable, Logger } from '@nestjs/common';
import { QueueConfig } from '../queue-config';
import { Environment } from '@/environment/environment';
import { join } from 'path';
import { readFileSync } from 'fs';
import { Validator, Schema } from 'jsonschema';

@Injectable()
export class QueueConfigService {

  readonly queueConfig: QueueConfig;

  private readonly logger = new Logger(QueueConfigService.name);

  constructor(
    private environment: Environment,
  ) {
    const configFileName = join('configs', 'queue', `${this.environment.queueConfig}.json`);
    this.logger.verbose(`using ${configFileName} for queue config`);
    const data = readFileSync(configFileName, 'utf-8');
    this.queueConfig = JSON.parse(data) as QueueConfig;
    this.validateQueueConfig(this.queueConfig);
  }

  private validateQueueConfig(data: any) {
    const validator = new Validator();

    const teamCountSchema: Schema = {
      id: '/teamCount',
      type: 'integer',
      minimum: 2,
      maximum: 2,
    };
    validator.addSchema(teamCountSchema);

    const gameClassSchema: Schema = {
      id: '/gameClass',
      type: 'object',
      properties: {
        name: {
          enum: [
            'scout',
            'soldier',
            'pyro',
            'demoman',
            'heavy',
            'engineer',
            'medic',
            'sniper',
            'spy',
          ],
        },
        count: {
          type: 'integer',
          minimum: 1,
        },
      },
    };
    validator.addSchema(gameClassSchema);

    const queueConfigSchema: Schema = {
      id: '/queueConfig',
      type: 'object',
      properties: {
        teamCount: {
          $ref: '/teamCount',
        },
        classes: {
          type: 'array',
          items: {
            $ref: '/gameClass',
          },
        },
        maps: {
          type: 'array',
          items:  {
            type: 'string',
          },
          minItems: 0,
        },
        execConfigs: {
          type: 'array',
          items: {
            type: 'string',
          },
        },
      },
      additionalItems: false,
    };

    validator.validate(data, queueConfigSchema, { throwError: true });
  }
}
