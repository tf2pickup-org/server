import { Environment } from '@/environment/environment';
import { Events } from '@/events/events';
import { PlayersService } from '@/players/services/players.service';
import { QueueSlot } from '@/queue/queue-slot';
import { QueueService } from '@/queue/services/queue.service';
import { iconUrlPath, promptPlayerThresholdRatio } from '@configs/discord';
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DiscordAPIError, Message } from 'discord.js';
import { debounceTime, map } from 'rxjs/operators';
import { queuePreview } from '../notifications';
import { DiscordService } from './discord.service';
import { URL } from 'url';
import { Cache } from 'cache-manager';
import { Mutex } from 'async-mutex';
import { QueueConfig } from '@/queue-config/interfaces/queue-config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

@Injectable()
export class QueuePromptsService implements OnModuleInit {
  private readonly queuePromptMessageIdCacheKey = 'queue_prompt_message_id';
  private requiredPlayerCount = 0;
  private readonly mutex = new Mutex();

  constructor(
    private events: Events,
    private discordService: DiscordService,
    private environment: Environment,
    private queueService: QueueService,
    private playersService: PlayersService,
    @Inject('QUEUE_CONFIG') private queueConfig: QueueConfig,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  onModuleInit() {
    this.events.queueSlotsChange
      .pipe(
        map(({ slots }) =>
          slots.map((slot) => ({
            id: slot.id,
            gameClass: slot.gameClass,
            playerId: slot.playerId,
          })),
        ),
        debounceTime(3000),
      )
      .subscribe(() => this.refreshPrompt(this.queueService.slots));
  }

  private async refreshPrompt(slots: QueueSlot[]) {
    await this.mutex.runExclusive(async () => {
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

      const message = await this.getPromptMessage();
      if (message) {
        message.edit({ embeds: [embed] });
      } else {
        if (this.playerThresholdMet()) {
          const sentMessage = await this.discordService
            .getPlayersChannel()
            ?.send({ embeds: [embed] });
          if (sentMessage) {
            await this.cache.set(
              this.queuePromptMessageIdCacheKey,
              sentMessage.id,
              0,
            );
          }
        }
      }
    });
  }

  private async slotsToGameClassData(slots: QueueSlot[]) {
    const playerData = await Promise.all(
      slots
        .filter((slot) => Boolean(slot.playerId))
        .map((slot) =>
          this.playersService.getById(slot.playerId!).then((player) => ({
            name: player.name,
            gameClass: slot.gameClass,
          })),
        ),
    );

    return this.queueConfig.classes.map((gameClass) => ({
      gameClass: gameClass.name,
      emoji: this.discordService.findEmoji(`tf2${gameClass.name}`),
      playersRequired: gameClass.count * this.queueConfig.teamCount,
      players: playerData.filter((p) => p.gameClass === gameClass.name),
    }));
  }

  private playerThresholdMet() {
    return (
      this.queueService.playerCount >=
      this.requiredPlayerCount * promptPlayerThresholdRatio
    );
  }

  private async getPromptMessage(): Promise<Message | undefined> {
    const id = await this.cache.get<string>(this.queuePromptMessageIdCacheKey);
    if (id) {
      try {
        return this.discordService.getPlayersChannel()?.messages.fetch(id);
      } catch (error) {
        if (error instanceof DiscordAPIError) {
          return undefined;
        }

        throw error;
      }
    } else {
      return undefined;
    }
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async ensurePromptIsVisible() {
    const messages = await this.discordService
      .getPlayersChannel()
      ?.messages.fetch({ limit: 1 });
    const promptMessage = await this.getPromptMessage();
    if (
      messages?.first()?.id !== promptMessage?.id &&
      this.playerThresholdMet()
    ) {
      await Promise.all([
        promptMessage?.delete(),
        this.cache.del(this.queuePromptMessageIdCacheKey),
      ]);
      await this.refreshPrompt(this.queueService.slots);
    }
  }
}
