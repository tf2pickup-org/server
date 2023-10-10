import { Environment } from '@/environment/environment';
import { Events } from '@/events/events';
import { QueueConfig } from '@/queue-config/interfaces/queue-config';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { catchError, concatMap, debounceTime, from, map, of } from 'rxjs';
import { queuePreview } from '../notifications';
import { iconUrlPath, promptPlayerThresholdRatio } from '@configs/discord';
import { PlayersService } from '@/players/services/players.service';
import {
  ChannelType,
  Client,
  DiscordAPIError,
  TextBasedChannel,
  TextChannel,
} from 'discord.js';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ConfigurationService } from '@/configuration/services/configuration.service';
import { GuildConfiguration } from '../types/guild-configuration';
import { Tf2ClassName } from '@/shared/models/tf2-class-name';
import { PlayerId } from '@/players/types/player-id';
import { Cron, CronExpression } from '@nestjs/schedule';
import { QueueService } from '@/queue/services/queue.service';

interface QueueSlotData {
  id: number;
  gameClass: Tf2ClassName;
  playerId: PlayerId | null;
}

const queuePromptMessageIdCacheKey = (guildId: string) =>
  `queue-prompt-message-id/${guildId}`;

const getMessage = async (channel: TextBasedChannel, messageId?: string) => {
  if (messageId) {
    try {
      return await channel.messages.fetch(messageId);
    } catch (error) {
      if (error instanceof DiscordAPIError) {
        return undefined;
      }

      throw error;
    }
  } else {
    return undefined;
  }
};

@Injectable()
export class QueuePromptsService implements OnModuleInit {
  private readonly logger = new Logger(QueuePromptsService.name);

  constructor(
    private readonly events: Events,
    private readonly environment: Environment,
    private readonly configurationService: ConfigurationService,
    @Inject('QUEUE_CONFIG') private readonly queueConfig: QueueConfig,
    private readonly playersService: PlayersService,
    @Inject('DISCORD_CLIENT') private readonly client: Client,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly queueService: QueueService,
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
        concatMap((slots) => from(this.refreshPrompt(slots))),
        catchError((error) => {
          this.logger.error(error);
          return of(null);
        }),
      )
      .subscribe();
  }

  async refreshPrompt(slots: QueueSlotData[]) {
    const clientName = new URL(this.environment.clientUrl).hostname;
    const playerCount = slots.filter((slot) => Boolean(slot.playerId)).length;
    const requiredPlayerCount = slots.length;

    await this.forEachEnabledChannel(async (channel) => {
      const embed = queuePreview({
        iconUrl: `${this.environment.clientUrl}/${iconUrlPath}`,
        clientName,
        clientUrl: this.environment.clientUrl,
        playerCount,
        requiredPlayerCount,
        gameClassData: await this.slotsToGameClassData(channel.guildId, slots),
      });

      const messageId = await this.cache.get<string>(
        queuePromptMessageIdCacheKey(channel.guildId),
      );

      const message = await getMessage(channel, messageId);
      if (message) {
        message.edit({ embeds: [embed] });
        return;
      }

      if (playerCount >= requiredPlayerCount * promptPlayerThresholdRatio) {
        const sentMessage = await channel.send({ embeds: [embed] });
        await this.cache.set(
          queuePromptMessageIdCacheKey(channel.guildId),
          sentMessage.id,
          0,
        );
      }
    });
  }

  private async slotsToGameClassData(guildId: string, slots: QueueSlotData[]) {
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

    return this.queueConfig.classes.map((gameClass) => {
      const emojiName = `tf2${gameClass.name}`;
      const guild = this.client.guilds.cache.get(guildId);
      const emoji = guild?.emojis.cache.find(
        (emoji) => emoji.name === emojiName,
      );

      if (!emoji) {
        this.logger.warn(
          `cannot find emoji ${emojiName} on guild ${guild?.name}`,
        );
      }

      return {
        gameClass: gameClass.name,
        emoji,
        playersRequired: gameClass.count * this.queueConfig.teamCount,
        players: playerData.filter((p) => p.gameClass === gameClass.name),
      };
    });
  }

  private async forEachEnabledChannel(
    callbackFn: (channel: TextChannel) => Promise<void>,
  ) {
    const config =
      await this.configurationService.get<GuildConfiguration[]>(
        'discord.guilds',
      );

    const enabledChannels = config
      .filter((guildConfiguration) =>
        Boolean(guildConfiguration?.queuePrompts?.channel),
      )
      .map((guildConfig) => guildConfig.queuePrompts!.channel!);

    await Promise.all(
      enabledChannels.map(async (channelId) => {
        const channel = this.client.channels.resolve(channelId);

        if (!channel) {
          throw new Error(`no such channel: ${channelId}`);
        }

        if (channel.type !== ChannelType.GuildText) {
          throw new Error(
            `invalid channel type (channelId=${channel.id}, channelType=${channel.type})`,
          );
        }

        await callbackFn(channel);
      }),
    );
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async ensurePromptIsVisible() {
    await this.forEachEnabledChannel(async (channel) => {
      const messages = await channel.messages.fetch({ limit: 1 });

      const messageId = await this.cache.get<string>(
        queuePromptMessageIdCacheKey(channel.guildId),
      );
      const message = await getMessage(channel, messageId);
      if (message?.id !== messages.first()?.id) {
        await Promise.all([
          message?.delete(),
          this.cache.del(queuePromptMessageIdCacheKey(channel.guildId)),
        ]);

        await this.refreshPrompt(this.queueService.slots);
      }
    });
  }
}
