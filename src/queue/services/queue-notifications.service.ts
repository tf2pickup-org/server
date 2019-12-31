import { Injectable, OnModuleInit } from '@nestjs/common';
import { QueueService } from './queue.service';
import { DiscordNotificationsService } from '@/discord/services/discord-notifications.service';
import { ConfigService } from '@nestjs/config/dist/config.service';

@Injectable()
export class QueueNotificationsService implements OnModuleInit {

  private readonly announcementDelay = this.configService.get<number>('discordNotifications.promptAnnouncementDelay');
  private readonly promptPlayerThresholdRatio = this.configService.get<number>('discordNotifications.promptPlayerThresholdRatio');
  private playerThreshold: number;
  private timer: NodeJS.Timer;

  constructor(
    private queueService: QueueService,
    private discordNotificationsService: DiscordNotificationsService,
    private configService: ConfigService,
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
      this.discordNotificationsService.notifyQueue(this.queueService.playerCount, this.queueService.requiredPlayerCount);
    }
  }

}
