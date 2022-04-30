import { QueueConfigService } from '@/queue/services/queue-config.service';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { join } from 'path';
import { compile } from 'handlebars';
import { readFile } from 'fs/promises';
import { isEmpty } from 'lodash';

@Injectable()
export class GameConfigsService implements OnModuleInit {
  private template: ReturnType<typeof compile>;
  variables: Record<string, any>;

  constructor(private queueConfigService: QueueConfigService) {
    this.variables = {
      teamSize: this.queueConfigService.queueConfig.classes.reduce(
        (prev, curr) => prev + curr.count,
        0,
      ),
    };
  }

  async onModuleInit() {
    const source = await readFile(
      join(__dirname, '..', 'configs', 'default.cfg'),
    );
    this.template = compile(source.toString());
  }

  async compileConfig(): Promise<string[]> {
    return this.template(this.variables)
      .split('\n')
      .filter((line) => !isEmpty(line));
  }
}
