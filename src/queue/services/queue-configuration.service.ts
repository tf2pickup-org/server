import { ConfigurationEntry } from '@/configuration/configuration-entry';
import { ConfigurationService } from '@/configuration/services/configuration.service';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { z } from 'zod';

@Injectable()
export class QueueConfigurationService implements OnModuleInit {
  constructor(private readonly configurationService: ConfigurationService) {}

  async onModuleInit() {
    const entries: ConfigurationEntry[] = [
      {
        key: 'queue.deny_players_with_no_skill_assigned',
        schema: z.boolean(),
        default: false,
      },
    ];

    entries.forEach((entry) => this.configurationService.register(entry));
  }
}
