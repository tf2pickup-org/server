import { QueueConfigService } from '@/queue/services/queue-config.service';
import { Injectable } from '@nestjs/common';
import { createReadStream } from 'fs';
import { join } from 'path';
import { createInterface } from 'readline';

@Injectable()
export class GameConfigsService {
  variables: Record<string, any>;

  constructor(private queueConfigService: QueueConfigService) {
    this.variables = {
      teamSize: this.queueConfigService.queueConfig.classes.reduce(
        (prev, curr) => prev + curr.count,
        0,
      ),
    };
  }

  async compileConfig(): Promise<string[]> {
    const readInterface = createInterface({
      input: createReadStream(join(__dirname, '..', 'configs', 'default.cfg')),
    });

    const matcher = /\$\{(\w+)\}/g;
    const lines = [];

    for await (const line of readInterface) {
      if (line && line.trim()) {
        const resolvedLine = line.replace(
          matcher,
          (_match, variableName) => this.variables[variableName] ?? '',
        );
        lines.push(resolvedLine);
      }
    }

    return lines;
  }
}
