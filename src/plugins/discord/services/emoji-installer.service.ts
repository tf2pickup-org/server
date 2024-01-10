import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Client, Guild } from 'discord.js';
import { emojisToInstall } from '../emojis-to-install';
import { ConfigurationService } from '@/configuration/services/configuration.service';
import { GuildConfiguration } from '../types/guild-configuration';
import { Events } from '@/events/events';
import { concatMap, filter, from, map } from 'rxjs';
import { DISCORD_CLIENT } from '../discord-client.token';
import { assertIsError } from '@/utils/assert-is-error';

@Injectable()
export class EmojiInstallerService implements OnModuleInit {
  private readonly logger = new Logger(EmojiInstallerService.name);

  constructor(
    @Inject(DISCORD_CLIENT) private readonly client: Client,
    private readonly configurationService: ConfigurationService,
    private readonly events: Events,
  ) {}

  async onModuleInit() {
    const config =
      await this.configurationService.get<GuildConfiguration[]>(
        'discord.guilds',
      );
    await this.installForAllEnabledGuilds(config);

    this.events.configurationChanged
      .pipe(
        filter(({ key }) => key === 'discord.guilds'),
        map(({ newValue }) => newValue),
        concatMap((config) =>
          from(this.installForAllEnabledGuilds(config as GuildConfiguration[])),
        ),
      )
      .subscribe();
  }

  async installEmojis(guild: Guild) {
    for (const emoji of emojisToInstall) {
      const found = guild.emojis.cache.find((e) => e.name === emoji.name);
      if (!found) {
        try {
          await guild.emojis.create({
            name: emoji.name,
            attachment: emoji.sourceUrl,
            reason: 'required by the tf2pickup.org server',
          });
          this.logger.log(`installed emoji ${emoji.name}`);
        } catch (error) {
          assertIsError(error);
          this.logger.error(
            `failed installing emoji '${emoji.name}' (${error.message}).`,
          );
        }
      }
    }
  }

  private async installForAllEnabledGuilds(config: GuildConfiguration[]) {
    await Promise.all(
      config
        .map((guildConfig) => guildConfig.id)
        .map((guildId) => this.client.guilds.resolve(guildId))
        .flatMap((guild) => (guild ? [guild] : []))
        .map(async (guild) => await this.installEmojis(guild)),
    );
  }
}
