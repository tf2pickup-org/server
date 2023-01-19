import { configurationEntry } from '@/configuration/configuration-entry';
import { ConfigurationService } from '@/configuration/services/configuration.service';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { z } from 'zod';

@Injectable()
export class PlayersConfigurationService implements OnModuleInit {
  constructor(private readonly configurationService: ConfigurationService) {}

  onModuleInit() {
    this.configurationService.register(
      configurationEntry('players.etf2l_account_required', z.boolean(), false),
      configurationEntry('players.minimum_in_game_hours', z.number(), 0),
    );
  }
}
