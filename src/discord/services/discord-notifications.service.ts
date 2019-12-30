import { Injectable, OnModuleInit, Logger, Inject, forwardRef } from '@nestjs/common';
import { Client, TextChannel, RichEmbed } from 'discord.js';
import { Environment } from '@/environment/environment';
import { PlayerBan } from '@/players/models/player-ban';
import { PlayersService } from '@/players/services/players.service';
import { Player } from '@/players/models/player';
import moment = require('moment');
import { config } from '@configs/config';

@Injectable()
export class DiscordNotificationsService implements OnModuleInit {

  private client = new Client();
  private enabled = false;
  private logger = new Logger(DiscordNotificationsService.name);

  constructor(
    private environment: Environment,
    @Inject(forwardRef(() => PlayersService)) private playersService: PlayersService,
  ) { }

  onModuleInit() {
    if (this.environment.discordBotToken) {
      this.client.on('ready', () => {
        this.logger.log(`Logged in as ${this.client.user.tag}`);
        this.enabled = true;
      });

      this.client.login(this.environment.discordBotToken)
        .catch(error => this.logger.error(error));
    }
  }

  notifyQueue(currentPlayerCount: number, targetPlayerCount: number) {
    if (this.enabled && this.environment.discordQueueNotificationsChannelId) {
      const channel = this.client.channels.get(this.environment.discordQueueNotificationsChannelId) as TextChannel;
      if (channel) {
        channel.send(`${config.discordNotifications.promptJoinQueueMentionRole} ${currentPlayerCount}/${targetPlayerCount} in the queue.
        Go to ${this.environment.clientUrl} and don't miss the next game!`);
      } else {
        this.logger.warn(`channel id ${this.environment.discordQueueNotificationsChannelId} not found`);
      }
    }
  }

  async notifyBan(ban: PlayerBan) {
    if (this.enabled && config.discordNotifications.notifyBans && this.environment.discordAdminNotificationsChannelId) {
      const channel = this.client.channels.get(this.environment.discordAdminNotificationsChannelId) as TextChannel;
      if (channel) {
        const admin = await this.playersService.getById(ban.admin.toString());
        const player = await this.playersService.getById(ban.player.toString());

        const endText = moment(ban.end).fromNow();

        const embed = new RichEmbed()
          .setColor('#dc3545')
          .setTitle('Ban added')
          .addField('Admin', admin.name)
          .addField('Player', player.name)
          .addField('Reason', ban.reason)
          .addField('Ends', endText)
          .setTimestamp();

        channel.send(embed);
      } else {
        this.logger.warn(`channel id ${this.environment.discordAdminNotificationsChannelId} not found`);
      }
    }
  }

  notifyNewPlayer(player: Player) {
    if (this.enabled && config.discordNotifications.notifyNewPlayers && this.environment.discordAdminNotificationsChannelId) {
      const channel = this.client.channels.get(this.environment.discordAdminNotificationsChannelId) as TextChannel;
      if (channel) {
        const embed = new RichEmbed()
          .setColor('#33dc7f')
          .setTitle('New player')
          .addField('Name', player.name)
          .addField('Profile URL', `${this.environment.clientUrl}/player/${player.id}`)
          .setTimestamp();

        channel.send(embed);
      } else {
        this.logger.warn(`channel id ${this.environment.discordAdminNotificationsChannelId} not found`);
      }
    }
  }

}
