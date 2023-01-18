import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Client, Guild, TextChannel, Role, Emoji, Intents } from 'discord.js';
import { Environment } from '@/environment/environment';
import { version } from '../../../../package.json';
import { emojisToInstall } from '../emojis-to-install';

@Injectable()
export class DiscordService implements OnModuleInit {
  private client = new Client({
    intents: [
      Intents.FLAGS.GUILDS,
      Intents.FLAGS.GUILD_EMOJIS_AND_STICKERS,
      Intents.FLAGS.GUILD_MESSAGES,
    ],
  });
  private guild?: Guild;
  private logger = new Logger(DiscordService.name);

  constructor(private environment: Environment) {}

  onModuleInit() {
    if (this.environment.discordBotToken) {
      this.client.on('ready', () => {
        if (this.client.user) {
          this.logger.log(`logged in as ${this.client.user.tag}`);
        }
        this.enable();
        this.getAdminsChannel()?.send(`Server version ${version} started.`);
        this.installEmojis();
      });

      this.client
        .login(this.environment.discordBotToken)
        .catch((error) => this.logger.error(error.toString()));
    }
  }

  getPlayersChannel(): TextChannel | null {
    return this.findChannel(this.environment.discordQueueNotificationsChannel);
  }

  getAdminsChannel(): TextChannel | null {
    return this.findChannel(this.environment.discordAdminNotificationsChannel);
  }

  findRole(name: string): Role | undefined {
    return this.guild?.roles?.cache.find((role) => role.name === name);
  }

  findEmoji(name: string): Emoji | undefined {
    return this.guild?.emojis?.cache.find((emoji) => emoji.name === name);
  }

  private enable() {
    this.guild = this.client.guilds.cache.find(
      (guild) => guild.name === this.environment.discordGuild,
    );
    if (!this.guild?.available) {
      this.logger.warn(
        `guild '${this.environment.discordGuild}' is not available; discord notifications will not work`,
      );
    }
  }

  private findChannel(name: string) {
    return this.guild?.channels?.cache
      .filter((c) => c instanceof TextChannel)
      .find((c) => (c as TextChannel).name === name) as TextChannel;
  }

  private async installEmojis() {
    const installedEmojis: Emoji[] = [];

    for (const emoji of emojisToInstall) {
      const found = this.guild?.emojis.cache.find((e) => e.name === emoji.name);
      if (!found) {
        try {
          const newEmoji = await this.guild?.emojis.create(
            emoji.sourceUrl,
            emoji.name,
            { reason: 'required by the tf2pickup.org server' },
          );
          if (newEmoji) {
            installedEmojis.push(newEmoji);
            this.logger.log(`Installed emoji ${emoji.name}`);
          }
        } catch (error) {
          this.logger.error(
            `Failed installing emoji '${emoji.name}' (${error}).`,
          );
        }
      }
    }

    if (installedEmojis.length > 0) {
      this.getAdminsChannel()?.send(
        `The following emoji${installedEmojis.length > 1 ? 's have' : ' has'}` +
          ` been installed: ${installedEmojis
            .map((e) => e.toString())
            .join(' ')}`,
      );
    }
  }
}
