import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Client, Guild, TextChannel, Role, Emoji } from 'discord.js';
import { Environment } from '@/environment/environment';
import { version } from '../../../package.json';
import { emojisToInstall } from '../emojis-to-install';

@Injectable()
export class DiscordService implements OnModuleInit {

  private client = new Client();
  private guild: Guild;
  private logger = new Logger(DiscordService.name);

  constructor(
    private environment: Environment,
  ) { }

  onModuleInit() {
    if (this.environment.discordBotToken) {
      this.client.on('ready', () => {
        this.logger.log(`logged in as ${this.client.user.tag}`);
        this.enable();
        this.getAdminsChannel().send(`Server version ${version} started.`);
        this.installEmojis();
      });

      this.client.login(this.environment.discordBotToken)
        .catch(error => this.logger.error(error.toString()));
    }
  }

  getPlayersChannel(): TextChannel | null {
    return this.findChannel(this.environment.discordQueueNotificationsChannel);
  }

  getAdminsChannel(): TextChannel | null {
    return this.findChannel(this.environment.discordAdminNotificationsChannel);
  }

  findRole(name: string): Role | null {
    return this.guild?.roles?.cache.find(role => role.name ===  name);
  }

  findEmoji(name: string): Emoji {
    return this.guild?.emojis?.cache.find(emoji => emoji.name === name);
  }

  private enable() {
    this.guild = this.client.guilds.cache.find(guild => guild.name === this.environment.discordGuild);
    if (!this.guild?.available) {
      this.logger.warn(`guild '${this.environment.discordGuild}' is not available; discord notifications will not work`);
    }
  }

  private findChannel(name: string) {
    return this.guild?.channels?.cache
      .filter(c => c instanceof TextChannel)
      .find(c => (c as TextChannel).name === name) as TextChannel;
  }

  private async installEmojis() {
    const installedEmojis: Emoji[] = [];

    for (const emoji of emojisToInstall) {
      const found = this.guild?.emojis.cache.find(e => e.name === emoji.name);
      if (!found) {
        try {
          const e = await this.guild.emojis.create(emoji.sourceUrl, emoji.name, { reason: 'required by the tf2pickup.pl server' });
          installedEmojis.push(e);
          this.logger.log(`Installed emoji ${emoji.name}`);
        } catch (error) {
          this.logger.error(`Failed installing emoji '${emoji.name}' (${error}).`);
        }
      }
    }

    if (installedEmojis.length > 0) {
      this.getAdminsChannel()?.send(`Installed emoji(s): ${installedEmojis.map(e => e.toString()).join(' ')}`);
    }
  }

}
