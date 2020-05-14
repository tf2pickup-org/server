import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { Client, TextChannel, MessageEmbed, Message, Guild } from 'discord.js';
import { Environment } from '@/environment/environment';
import { ConfigService } from '@nestjs/config';
import { SubstituteRequest } from '@/queue/substitute-request';
import { MessageEmbedFactoryService } from './message-embed-factory.service';
import { PlayerBan } from '@/players/models/player-ban';
import { Player } from '@/players/models/player';

export enum TargetChannel {
  Admins,
  Queue,
}

@Injectable()
export class DiscordNotificationsService implements OnModuleInit {

  private client = new Client();
  private guild: Guild;
  private enabled = false;
  private logger = new Logger(DiscordNotificationsService.name);

  constructor(
    private environment: Environment,
    private configService: ConfigService,
    private messageEmbedFactoryService: MessageEmbedFactoryService,
  ) { }

  onModuleInit() {
    if (this.environment.discordBotToken) {
      this.client.on('ready', () => {
        this.logger.log(`logged in as ${this.client.user.tag}`);
        this.enable();
      });

      this.client.login(this.environment.discordBotToken)
        .catch(error => this.logger.error(error.toString()));
    }
  }

  notifyQueue(currentPlayerCount: number, targetPlayerCount: number) {
    if (this.enabled && this.environment.discordQueueNotificationsChannel) {
      const channel = this.findChannel(this.environment.discordQueueNotificationsChannel);
      if (channel) {
        const message = `${currentPlayerCount}/${targetPlayerCount} in the queue.
          Go to ${this.environment.clientUrl} and don't miss the next game!`;
        const roleToMention = this.guild.roles.cache.find(role => role.name === this.environment.discordQueueNotificationsMentionRole);
        if (roleToMention?.mentionable) {
          channel.send(`${roleToMention} ${message}`);
        } else {
          channel.send(message);
        }
      } else {
        this.logger.warn(`channel ${this.environment.discordQueueNotificationsChannel} not found`);
      }
    }
  }

  async sendNotification(targetChannel: TargetChannel, notification: MessageEmbed): Promise<Message> {
    if (!this.enabled) {
      return null;
    }

    let channelName: string;
    switch (targetChannel) {
      case TargetChannel.Admins:
        channelName = this.environment.discordAdminNotificationsChannel;
        break;

      case TargetChannel.Queue:
        channelName = this.environment.discordQueueNotificationsChannel;
        break;
    }

    if (!channelName) {
      return null;
    }

    const channel = this.findChannel(channelName);
    if (channel) {
      return channel.send(notification);
    } else {
      this.logger.warn(`channel ${channelName} not found`);
      return null;
    }
  }

  async notifySubstituteRequest(substituteRequest: SubstituteRequest) {
    return this.sendNotification(TargetChannel.Queue, await this.messageEmbedFactoryService.fromSubstituteRequest(substituteRequest));
  }

  async notifyPlayerBanAdded(playerBan: PlayerBan) {
    return this.sendNotification(TargetChannel.Admins, await this.messageEmbedFactoryService.fromPlayerBanAdded(playerBan));
  }

  async notifyPlayerBanRevoked(playerBan: PlayerBan) {
    return this.sendNotification(TargetChannel.Admins, await this.messageEmbedFactoryService.fromPlayerBanRevoked(playerBan));
  }

  async notifyNewPlayer(player: Player) {
    return this.sendNotification(TargetChannel.Admins, await this.messageEmbedFactoryService.fromNewPlayer(player));
  }

  async notifyNameChange(player: Player, oldName: string) {
    return this.sendNotification(TargetChannel.Admins, await this.messageEmbedFactoryService.fromNameChange(player, oldName));
  }

  private enable() {
    this.guild = this.client.guilds.cache.find(guild => guild.name === this.environment.discordGuild);
    if (this.guild?.available) {
      this.enabled = true;
    } else {
      this.logger.warn(`Guild '${this.environment.discordGuild}' is not available`);
    }
  }

  private findChannel(name: string) {
    return this.guild.channels.cache
      .filter(c => c instanceof TextChannel)
      .find(c => (c as TextChannel).name === name) as TextChannel;
  }

}
