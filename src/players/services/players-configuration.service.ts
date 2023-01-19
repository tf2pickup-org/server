import { ConfigurationEntry } from '@/configuration/configuration-entry';
import { ConfigurationService } from '@/configuration/services/configuration.service';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { z } from 'zod';

@Injectable()
export class PlayersConfigurationService implements OnModuleInit {
  constructor(private readonly configurationService: ConfigurationService) {}

  async onModuleInit() {
    const entries: ConfigurationEntry[] = [
      {
        key: 'players.etf2l_account_required',
        schema: z.boolean(),
        default: false,
      },
      {
        key: 'players.minimum_in_game_hours',
        schema: z.number(),
        default: 0,
      },
    ];

    entries.forEach((entry) => this.configurationService.register(entry));
  }
}
