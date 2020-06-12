import { Injectable, OnModuleInit } from '@nestjs/common';
import { QueueService } from './queue.service';
import { ConfigService } from '@nestjs/config/dist/config.service';
import { Environment } from '@/environment/environment';
import { DiscordService } from '@/discord/services/discord.service';

@Injectable()
export class QueueNotificationsService implements OnModuleInit {

  private readonly announcementDelay = this.configService.get<number>('discordNotifications.promptAnnouncementDelay');
  private readonly promptPlayerThresholdRatio = this.configService.get<number>('discordNotifications.promptPlayerThresholdRatio');
  private playerThreshold: number;
  private timer: NodeJS.Timer;

  constructor(
    private queueService: QueueService,
    private configService: ConfigService,
    private environment: Environment,
    private discordService: DiscordService,
  ) { }

  onModuleInit() {
    this.playerThreshold = this.queueService.requiredPlayerCount * this.promptPlayerThresholdRatio;
    this.queueService.playerJoin.subscribe(() => this.triggerNotifier());
  }

  private triggerNotifier() {
    if (this.timer) {
      clearTimeout(this.timer);
    }

    this.timer = setTimeout(() => this.maybeNotify(), this.announcementDelay);
  }

  private maybeNotify() {
    if (this.queueService.playerCount >= this.playerThreshold && this.queueService.playerCount < this.queueService.requiredPlayerCount) {
      const message = `${this.queueService.playerCount}/${this.queueService.requiredPlayerCount} in the queue. Go to ${this.environment.clientUrl} and don't miss the next game!`;
      const channel = this.discordService.getPlayersChannel();
      const roleToMention = this.discordService.findRole(this.environment.discordQueueNotificationsMentionRole);

      if (roleToMention?.mentionable) {
        channel?.send(`${roleToMention} ${message}`);
      } else {
        channel?.send(message);
      }
    }
  }

}
