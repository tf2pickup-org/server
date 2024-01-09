import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { join } from 'path';
import { compile } from 'handlebars';
import { readFile } from 'fs/promises';
import { isEmpty } from 'lodash';
import { QueueConfig } from '@/queue-config/interfaces/queue-config';
import { QUEUE_CONFIG } from '@/queue-config/queue-config.token';

@Injectable()
export class GameConfigsService implements OnModuleInit {
  private template!: ReturnType<typeof compile>;
  variables: Record<string, any>;

  constructor(@Inject(QUEUE_CONFIG) private readonly queueConfig: QueueConfig) {
    this.variables = {
      teamSize: this.queueConfig.classes.reduce(
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

  compileConfig(): string[] {
    return this.template(this.variables)
      .split('\n')
      .filter((line) => !isEmpty(line));
  }
}
