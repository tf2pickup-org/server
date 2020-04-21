import { Injectable, Logger, Inject } from '@nestjs/common';
import { QueueConfig } from '../queue-config';
import { Validator, Schema } from 'jsonschema';

@Injectable()
export class QueueConfigService {

  readonly queueConfig: QueueConfig;

  private readonly logger = new Logger(QueueConfigService.name);

  constructor(
    @Inject('QUEUE_CONFIG_JSON') queueConfigJson: string,
  ) {
    this.queueConfig = JSON.parse(queueConfigJson) as QueueConfig;
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

    const mapPoolItemSchema: Schema = {
      id: '/mapPoolItem',
      type: 'object',
      properties: {
        name: {
          type: 'string',
        },
        configName: {
          type: 'string',
        },
      },
    };
    validator.addSchema(mapPoolItemSchema);

    const queueConfigSchema: Schema = {
      id: '/queueConfig',
      type: 'object',
      properties: {
        teamCount: {
          $ref: teamCountSchema.id,
        },
        classes: {
          type: 'array',
          items: {
            $ref: gameClassSchema.id,
          },
        },
        maps: {
          type: 'array',
          items:  {
            $ref: mapPoolItemSchema.id,
          },
          minItems: 0,
        },
        configs: {
          type: 'object',
        },
        execConfigs: {
          type: 'array',
          items: {
            type: 'string',
          },
        },
        whitelistId: {
          type: 'string',
        },
      },
      additionalItems: false,
    };

    validator.validate(data, queueConfigSchema, { throwError: true });
  }
}
