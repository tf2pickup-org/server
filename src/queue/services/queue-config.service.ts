import { Injectable, Logger } from '@nestjs/common';
import { QueueConfig } from '../queue-config';
import { ConfigService } from '@/config/config.service';
import { join } from 'path';
import { readFileSync } from 'fs';

@Injectable()
export class QueueConfigService {

  readonly queueConfig: QueueConfig;

  private readonly logger = new Logger(QueueConfigService.name);

  constructor(
    private configService: ConfigService,
  ) {
    const configFileName = join('configs', 'queue', `${this.configService.queueConfig}.json`);
    this.logger.log(`Using ${configFileName} for queue config`);
    const data = readFileSync(configFileName, 'utf-8');
    this.queueConfig = JSON.parse(data) as QueueConfig;
  }
}
