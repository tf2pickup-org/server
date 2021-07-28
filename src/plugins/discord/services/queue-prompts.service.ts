import { Environment } from '@/environment/environment';
import { Events } from '@/events/events';
import { PlayersService } from '@/players/services/players.service';
import { QueueSlot } from '@/queue/queue-slot';
import { QueueConfigService } from '@/queue/services/queue-config.service';
import { QueueService } from '@/queue/services/queue.service';
import { iconUrlPath, promptPlayerThresholdRatio } from '@configs/discord';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Message } from 'discord.js';
import { debounceTime } from 'rxjs/operators';
import { queuePreview } from '../notifications';
import { DiscordService } from './discord.service';
import { URL } from 'url';

@Injectable()
export class QueuePromptsService implements OnModuleInit {
  private requiredPlayerCount = 0;
  private message?: Message;

  constructor(
    private events: Events,
    private discordService: DiscordService,
    private environment: Environment,
    private queueService: QueueService,
    private playersService: PlayersService,
    private queueConfigService: QueueConfigService,
  ) {}

  onModuleInit() {
    this.events.queueSlotsChange
      .pipe(debounceTime(3000))
      .subscribe(() => this.refreshPrompt(this.queueService.slots));
  }

  private async refreshPrompt(slots: QueueSlot[]) {
    this.requiredPlayerCount = slots.length;
    const clientName = new URL(this.environment.clientUrl).hostname;

    const embed = queuePreview({
      iconUrl: `${this.environment.clientUrl}/${iconUrlPath}`,
      clientName,
      clientUrl: this.environment.clientUrl,
      playerCount: this.queueService.playerCount,
      requiredPlayerCount: this.queueService.requiredPlayerCount,
      gameClassData: await this.slotsToGameClassData(slots),
    });

    if (this.message) {
      this.message.edit({ embed });
    } else {
      if (this.playerThresholdMet()) {
        this.message = await this.discordService
          .getPlayersChannel()
          ?.send({ embed });
      }
    }
  }

  private async slotsToGameClassData(slots: QueueSlot[]) {
    const playerData = await Promise.all(
      slots
        .filter((slot) => !!slot.playerId)
        .map((slot) =>
          this.playersService.getById(slot.playerId).then((player) => ({
            name: player.name,
            gameClass: slot.gameClass,
          })),
        ),
    );

    return this.queueConfigService.queueConfig.classes.map((gameClass) => ({
      gameClass: gameClass.name,
      emoji: this.discordService.findEmoji(`tf2${gameClass.name}`),
      playersRequired:
        gameClass.count * this.queueConfigService.queueConfig.teamCount,
      players: playerData.filter((p) => p.gameClass === gameClass.name),
    }));
  }

  private playerThresholdMet() {
    return (
      this.queueService.playerCount >=
      this.requiredPlayerCount * promptPlayerThresholdRatio
    );
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async ensurePromptIsVisible() {
    const messages = await this.discordService
      .getPlayersChannel()
      .messages.fetch({ limit: 1 });
    if (
      messages?.first()?.id !== this.message?.id &&
      this.playerThresholdMet()
    ) {
      await this.message?.delete();
      delete this.message;
      this.refreshPrompt(this.queueService.slots);
    }
  }
}
