import { Injectable, OnModuleInit, Logger, Inject, forwardRef } from '@nestjs/common';
import { Client, TextChannel, RichEmbed } from 'discord.js';
import { Environment } from '@/environment/environment';
import { PlayerBan } from '@/players/models/player-ban';
import { PlayersService } from '@/players/services/players.service';
import { Player } from '@/players/models/player';
import moment = require('moment');
import { ConfigService } from '@nestjs/config';
import { SubstituteRequest } from '@/queue/substitute-request';

@Injectable()
export class DiscordNotificationsService implements OnModuleInit {

  private client = new Client();
  private enabled = false;
  private logger = new Logger(DiscordNotificationsService.name);
  private notifyBans = this.configService.get<boolean>('discordNotifications.notifyBans');
  private notifyNewPlayers = this.configService.get<boolean>('discordNotifications.notifyNewPlayers');
  private notifySubstituteRequests = this.configService.get<boolean>('discordNotifications.notifySubstituteRequests');

  constructor(
    private environment: Environment,
    @Inject(forwardRef(() => PlayersService)) private playersService: PlayersService,
    private configService: ConfigService,
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
    if (this.enabled && this.environment.discordQueueNotificationsChannel) {
      const channel = this.findChannel(this.environment.discordQueueNotificationsChannel);
      if (channel) {
        const mentionRole = this.configService.get<string>('discordNotifications.promptJoinQueueMentionRole');
        channel.send(`${mentionRole} ${currentPlayerCount}/${targetPlayerCount} in the queue.
        Go to ${this.environment.clientUrl} and don't miss the next game!`);
      } else {
        this.logger.warn(`channel ${this.environment.discordQueueNotificationsChannel} not found`);
      }
    }
  }

  async notifyBanAdded(ban: PlayerBan) {
    if (this.enabled && this.notifyBans && this.environment.discordAdminNotificationsChannel) {
      const channel = this.findChannel(this.environment.discordAdminNotificationsChannel);

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
        this.logger.warn(`channel ${this.environment.discordAdminNotificationsChannel} not found`);
      }
    }
  }

  async notifyBanRevoked(ban: PlayerBan) {
    if (this.enabled && this.notifyBans && this.environment.discordAdminNotificationsChannel) {
      const channel = this.findChannel(this.environment.discordAdminNotificationsChannel);
      if (channel) {
        const player = await this.playersService.getById(ban.player.toString());

        const embed = new RichEmbed()
          .setColor('#9838dc')
          .setTitle('Ban revoked')
          .addField('Player', player.name)
          .setTimestamp();

        channel.send(embed);
      } else {
        this.logger.warn(`channel ${this.environment.discordAdminNotificationsChannel} not found`);
      }
    }
  }

  notifyNewPlayer(player: Player) {
    if (this.enabled && this.notifyNewPlayers && this.environment.discordAdminNotificationsChannel) {
      const channel = this.findChannel(this.environment.discordAdminNotificationsChannel);
      if (channel) {
        const embed = new RichEmbed()
          .setColor('#33dc7f')
          .setTitle('New player')
          .addField('Name', player.name)
          .addField('Profile URL', `${this.environment.clientUrl}/player/${player.id}`)
          .setTimestamp();

        channel.send(embed);
      } else {
        this.logger.warn(`channel ${this.environment.discordAdminNotificationsChannel} not found`);
      }
    }
  }

  private findChannel(name: string) {
    return this.client.channels
    .filter(c => c instanceof TextChannel)
    .find(c => (c as TextChannel).name === name) as TextChannel;
  }

  notifySubstituteIsNeeded(substituteRequest: SubstituteRequest) {
    if (this.enabled && this.notifySubstituteRequests && this.environment.discordQueueNotificationsChannel) {
      const channel = this.findChannel(this.environment.discordQueueNotificationsChannel);
      if (channel) {
        const embed = new RichEmbed()
          .setColor('#ff557f')
          .setTitle('A subsitute is needed')
          .addField('Game no.', `#${substituteRequest.gameNumber}`)
          .addField('Class', substituteRequest.gameClass)
          .addField('Team', substituteRequest.team)
          .setURL(`${this.environment.clientUrl}/game/${substituteRequest.gameId}`)
          .setThumbnail('https://tf2pickup.pl/assets/android-icon-192x192.png');

        channel.send(embed);
      } else {
        this.logger.warn(`channel ${this.environment.discordQueueNotificationsChannel} not found`);
      }
    }
  }

}
