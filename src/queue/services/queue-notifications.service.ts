import { Injectable, OnModuleInit } from '@nestjs/common';
import { QueueService } from './queue.service';
import { DiscordNotificationsService } from '@/discord/services/discord-notifications.service';

@Injectable()
export class QueueNotificationsService implements OnModuleInit {

  private readonly messageDelay = 5 * 60 * 1000; // 5 minutes
  private playerThreshold: number;
  private timer: NodeJS.Timer;

  constructor(
    private queueService: QueueService,
    private discordNotificationsService: DiscordNotificationsService,
  ) { }

  onModuleInit() {
    this.playerThreshold = this.queueService.requiredPlayerCount * 0.5;
    this.queueService.playerJoin.subscribe(() => this.triggerNotifier());
  }

  private triggerNotifier() {
    if (this.timer) {
      clearTimeout(this.timer);
    }

    this.timer = setTimeout(() => this.maybeNotify(), this.messageDelay);
  }

  private maybeNotify() {
    if (this.queueService.playerCount >= this.playerThreshold && this.queueService.playerCount < this.queueService.requiredPlayerCount) {
      this.discordNotificationsService.notifyQueue(this.queueService.playerCount, this.queueService.requiredPlayerCount);
    }
  }

}
