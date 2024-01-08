import { ConfigurationService } from '@/configuration/services/configuration.service';
import { Events } from '@/events/events';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Client, Guild, TextBasedChannel } from 'discord.js';
import { GuildConfiguration } from '../types/guild-configuration';
import { Game } from '@/games/models/game';
import { substituteRequest } from '../notifications';
import { Environment } from '@/environment/environment';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PlayerId } from '@/players/types/player-id';
import { catchError, concatMap, filter, from, map, of } from 'rxjs';
import { GamesService } from '@/games/services/games.service';
import { substituteWasNeeded } from '../notifications/substitute-was-needed';
import { SlotStatus } from '@/games/models/slot-status';
import { DISCORD_CLIENT } from '../discord-client.token';

const cacheKeyForPlayer = (guildId: string, playerId: PlayerId) =>
  `player-substitute-notifications/${guildId}/${playerId}`;

@Injectable()
export class PlayerSubsNotificationsService implements OnModuleInit {
  private readonly logger = new Logger(PlayerSubsNotificationsService.name);

  constructor(
    private readonly events: Events,
    @Inject(DISCORD_CLIENT) private readonly client: Client,
    private readonly configurationService: ConfigurationService,
    private readonly environment: Environment,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly gamesService: GamesService,
  ) {}

  onModuleInit() {
    this.events.substituteRequested
      .pipe(
        concatMap(({ gameId, playerId }) =>
          from(Promise.all([this.gamesService.getById(gameId), playerId])),
        ),
        concatMap(([game, playerId]) =>
          from(this.notifySubstituteRequested(game, playerId)),
        ),
        catchError((error) => {
          this.logger.error(error);
          return of(null);
        }),
      )
      .subscribe();

    this.events.substituteRequestCanceled
      .pipe(
        concatMap(({ gameId, playerId }) =>
          from(Promise.all([this.gamesService.getById(gameId), playerId])),
        ),
        concatMap(([game, playerId]) =>
          from(this.markSubstituteRequestInvalid(game, playerId)),
        ),
        catchError((error) => {
          this.logger.error(error);
          return of(null);
        }),
      )
      .subscribe();

    this.events.playerReplaced
      .pipe(
        concatMap(({ gameId, replaceeId }) =>
          from(Promise.all([this.gamesService.getById(gameId), replaceeId])),
        ),
        concatMap(([game, playerId]) =>
          from(this.markSubstituteRequestInvalid(game, playerId)),
        ),
        catchError((error) => {
          this.logger.error(error);
          return of(null);
        }),
      )
      .subscribe();

    this.events.gameChanges
      .pipe(
        filter(
          ({ oldGame, newGame }) =>
            oldGame.isInProgress() && !newGame.isInProgress(),
        ),
        map(({ oldGame, newGame }) => ({
          oldGame,
          newGame,
          slots: oldGame.slots.filter(
            (s) => s.status === SlotStatus.waitingForSubstitute,
          ),
        })),
        concatMap(({ newGame, slots }) =>
          from(
            Promise.all(
              slots.map((slot) =>
                this.markSubstituteRequestInvalid(newGame, slot.player),
              ),
            ),
          ),
        ),
        catchError((error) => {
          this.logger.error(error);
          return of(null);
        }),
      )
      .subscribe();
  }

  async notifySubstituteRequested(game: Game, playerId: PlayerId) {
    const slot = game.findPlayerSlot(playerId);
    if (!slot) {
      throw new Error(`no such slot: ${playerId} (gameId=${game.id})`);
    }

    const embed = substituteRequest({
      gameNumber: game.number,
      gameClass: slot.gameClass,
      team: slot.team.toUpperCase(),
      gameUrl: `${this.environment.clientUrl}/game/${game.id}`,
    });

    await this.forEachEnabledChannel(
      async ({ guildConfiguration, guild, channel }) => {
        const role = guildConfiguration.substituteNotifications?.role
          ? guild.roles.cache.get(
              guildConfiguration.substituteNotifications.role,
            )
          : undefined;

        const message = await channel.send({
          content: role?.mentionable ? role.toString() : undefined,
          embeds: [embed],
        });
        await this.cache.set(
          cacheKeyForPlayer(guild.id, slot.player),
          message.id,
          0,
        );
      },
    );
  }

  async markSubstituteRequestInvalid(game: Game, playerId: PlayerId) {
    const slot = game.findPlayerSlot(playerId, [
      SlotStatus.active,
      SlotStatus.replaced,
    ]);
    if (!slot) {
      throw new Error(`no such slot: ${playerId} (gameId=${game.id})`);
    }

    const embed = substituteWasNeeded({
      gameNumber: game.number,
      gameUrl: `${this.environment.clientUrl}/game/${game.id}`,
    });

    await this.forEachEnabledChannel(async ({ guild, channel }) => {
      const key = cacheKeyForPlayer(guild.id, slot.player);
      const messageId = (await this.cache.get(key)) as string;
      const message = await channel.messages.fetch(messageId);
      if (message) {
        await message.edit({ embeds: [embed] });
      } else {
        this.logger.warn(
          `no such message: ${messageId} (guild: ${guild.name}, channelId: ${channel.id})`,
        );
        return;
      }

      await this.cache.del(key);
    });
  }

  private async forEachEnabledChannel(
    callbackFn: (params: {
      guildConfiguration: GuildConfiguration;
      guild: Guild;
      channel: TextBasedChannel;
    }) => Promise<void>,
  ) {
    const config =
      await this.configurationService.get<GuildConfiguration[]>(
        'discord.guilds',
      );

    const enabledChannels = config.filter((guildConfiguration) =>
      Boolean(guildConfiguration?.substituteNotifications?.channel),
    );

    await Promise.all(
      enabledChannels.map(async (guildConfiguration) => {
        const guild = this.client.guilds.cache.get(guildConfiguration.id);
        if (!guild) {
          throw new Error(`no such guild: ${guildConfiguration.id}`);
        }

        const channel = guild.channels.cache.get(
          guildConfiguration.substituteNotifications!.channel!,
        );

        if (!channel) {
          throw new Error(
            `no such channel: ${
              guildConfiguration.substituteNotifications!.channel
            }`,
          );
        }

        if (!channel.isTextBased()) {
          throw new Error(
            `invalid channel type (channelId=${channel.id}, channelName=${channel.name}, channelType=${channel.type})`,
          );
        }

        await callbackFn({ guildConfiguration, guild, channel });
      }),
    );
  }
}
