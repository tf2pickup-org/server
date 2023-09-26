import { configurationEntry } from '@/configuration/configuration-entry';
import { ConfigurationService } from '@/configuration/services/configuration.service';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { z } from 'zod';
import { guildConfigurationSchema } from '../types/guild-configuration';

@Injectable()
export class DiscordConfigurationService implements OnModuleInit {
  constructor(private readonly configurationService: ConfigurationService) {}

  onModuleInit() {
    this.configurationService.register(
      configurationEntry(
        'discord.guilds',
        z.array(guildConfigurationSchema),
        [],
      ),
    );
  }
}
