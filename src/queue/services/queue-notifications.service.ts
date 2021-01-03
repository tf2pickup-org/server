import { Injectable, OnModuleInit } from '@nestjs/common';
import { QueueService } from './queue.service';
import { Environment } from '@/environment/environment';
import { DiscordService } from '@/discord/services/discord.service';
import { promptPlayerThresholdRatio, promptAnnouncementDelay } from '@configs/discord';
import { Events } from '@/events';

@Injectable()
export class QueueNotificationsService implements OnModuleInit {

  private playerThreshold: number;
  private timer: NodeJS.Timer;

  constructor(
    private queueService: QueueService,
    private environment: Environment,
    private discordService: DiscordService,
    private events: Events,
  ) { }

  onModuleInit() {
    this.playerThreshold = this.queueService.requiredPlayerCount * promptPlayerThresholdRatio;
    this.events.playerJoinsQueue.subscribe(() => this.triggerNotifier());
  }

  private triggerNotifier() {
    if (this.timer) {
      clearTimeout(this.timer);
    }

    this.timer = setTimeout(() => this.maybeNotify(), promptAnnouncementDelay);
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
