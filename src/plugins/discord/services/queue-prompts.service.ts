import { Environment } from '@/environment/environment';
import { Events } from '@/events/events';
import { QueueConfig } from '@/queue-config/interfaces/queue-config';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { catchError, concatMap, debounceTime, from, map, of } from 'rxjs';
import { queuePreview } from '../notifications';
import { iconUrlPath, promptPlayerThresholdRatio } from '@configs/discord';
import { PlayersService } from '@/players/services/players.service';
import {
  Client,
  DiscordAPIError,
  Message,
  TextBasedChannel,
  TextChannel,
} from 'discord.js';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ConfigurationService } from '@/configuration/services/configuration.service';
import { GuildConfiguration } from '../types/guild-configuration';
import { Tf2ClassName } from '@/shared/models/tf2-class-name';
import { PlayerId } from '@/players/types/player-id';

interface QueueSlotData {
  id: number;
  gameClass: Tf2ClassName;
  playerId: PlayerId | null;
}

const queuePromptMessageIdCacheKey = (guildId: string) =>
  `queue_prompt_message_id/${guildId}`;

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

    const config =
      await this.configurationService.get<GuildConfiguration[]>(
        'discord.guilds',
      );

    const enabledGuilds: GuildConfiguration[] = config.filter((guildConfig) =>
      Boolean(guildConfig?.queueNotifications?.channel),
    );

    enabledGuilds.forEach(async (guild) => {
      const embed = queuePreview({
        iconUrl: `${this.environment.clientUrl}/${iconUrlPath}`,
        clientName,
        clientUrl: this.environment.clientUrl,
        playerCount,
        requiredPlayerCount,
        gameClassData: await this.slotsToGameClassData(guild.id, slots),
      });

      await this.maybeSendPromptMessage(
        guild.id,
        guild.queueNotifications!.channel!,
        {
          embeds: [embed],
        },
        () => playerCount >= requiredPlayerCount * promptPlayerThresholdRatio,
      );
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

  private async maybeSendPromptMessage(
    guildId: string,
    channelId: string,
    content: Parameters<typeof Message.prototype.edit>[0] &
      Parameters<typeof TextChannel.prototype.send>[0],
    thresholdMet: () => boolean,
  ) {
    const guild = this.client.guilds.cache.get(guildId);
    if (!guild) {
      throw new Error(`no such guild: ${guildId}`);
    }

    const channel = guild.channels.cache.find(
      (channel) => channel.id === channelId,
    );
    if (!channel) {
      throw new Error(`no such channel: ${channelId}`);
    }

    if (!channel.isTextBased()) {
      throw new Error(
        `invalid channel type (channelId=${channel.id}, channelName=${channel.name}, channelType=${channel.type})`,
      );
    }

    const messageId = await this.cache.get<string>(
      queuePromptMessageIdCacheKey(guild.id),
    );

    const message = await this.getMessage(channel, messageId);
    if (message) {
      message.edit(content);
      return;
    }

    if (thresholdMet()) {
      const sentMessage = await channel.send(content);
      await this.cache.set(
        queuePromptMessageIdCacheKey(guild.id),
        sentMessage.id,
        0,
      );
    }
  }

  async getMessage(channel: TextBasedChannel, messageId?: string) {
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
  }
}
