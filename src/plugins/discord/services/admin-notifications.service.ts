import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigurationService } from '@/configuration/services/configuration.service';
import { GuildConfiguration } from '../types/guild-configuration';
import { APIEmbed, Client, JSONEncodable } from 'discord.js';
import { Events } from '@/events/events';
import { Subject, concatMap, filter, from, map } from 'rxjs';
import { PlayersService } from '@/players/services/players.service';
import { mapsScrambled } from '../notifications/maps-scrambled';
import { Environment } from '@/environment/environment';
import { iconUrlPath } from '@configs/discord';
import {
  gameForceEnded,
  gameServerAdded,
  gameServerOffline,
  gameServerOnline,
  newPlayer,
  playerBanAdded,
  playerBanRevoked,
  playerProfileUpdated,
  playerSkillChanged,
} from '../notifications';
import { extractPlayerChanges } from '../utils/extract-player-changes';
import { isEqual } from 'lodash';
import { StaticGameServersService } from '@/game-servers/providers/static-game-server/services/static-game-servers.service';
import { GameState } from '@/games/models/game-state';
import { GamesService } from '@/games/services/games.service';
import { substituteRequested } from '../notifications/substitute-requested';
import { version } from '../../../../package.json';
import { DISCORD_CLIENT } from '../discord-client.token';

@Injectable()
export class AdminNotificationsService implements OnModuleInit {
  private readonly logger = new Logger(AdminNotificationsService.name);
  private readonly notifications = new Subject<
    JSONEncodable<APIEmbed> | APIEmbed
  >();

  constructor(
    @Inject(DISCORD_CLIENT) private readonly client: Client,
    private readonly configurationService: ConfigurationService,
    private readonly events: Events,
    private readonly playersService: PlayersService,
    private readonly environment: Environment,
    private readonly staticGameServersService: StaticGameServersService,
    private readonly gamesService: GamesService,
  ) {}

  async onModuleInit() {
    const initialize = async () => {
      const config =
        await this.configurationService.get<GuildConfiguration[]>(
          'discord.guilds',
        );

      await Promise.all(
        config
          .map((config) => config.adminNotifications?.channel)
          .filter((channelId) => Boolean(channelId))
          .map(async (channelId) => {
            try {
              const channel = this.client.channels.resolve(channelId!);
              if (!channel) {
                throw new Error(`channel ${channelId} could not be resolved`);
              }

              if (!channel.isTextBased()) {
                throw new Error(`channel ${channel.name} is not text-based`);
              }
              await channel.send(`Server version ${version} started`);
            } catch (error) {
              this.logger.error(error);
            }
          }),
      );
    };

    if (this.client.isReady()) {
      await initialize();
    } else {
      this.client.once('ready', async () => await initialize());
    }

    this.notifications.subscribe(async (embed) => {
      const channels = await this.getAdminChannels();
      await Promise.all(
        channels.map(async (c) => await c.send({ embeds: [embed] })),
      );
    });

    this.events.playerRegisters
      .pipe(
        map(({ player }) =>
          newPlayer({
            name: player.name,
            profileUrl: `${this.environment.clientUrl}/player/${player.id}`,
          }),
        ),
      )
      .subscribe((embed) => this.notifications.next(embed));

    this.events.playerUpdates
      .pipe(
        filter(({ adminId }) => Boolean(adminId)),
        map(({ oldPlayer, newPlayer, adminId }) => ({
          oldPlayer,
          newPlayer,
          adminId,
          changes: extractPlayerChanges(oldPlayer, newPlayer),
        })),
        filter(({ changes }) => Object.keys(changes).length > 0),
        concatMap(({ newPlayer, adminId, changes }) =>
          from(
            Promise.all([
              newPlayer,
              this.playersService.getById(adminId!),
              changes,
            ]),
          ),
        ),
        map(([player, admin, changes]) =>
          playerProfileUpdated({
            player: {
              name: player.name,
              profileUrl: `${this.environment.clientUrl}/player/${player.id}`,
              avatarUrl: player.avatar?.medium,
            },
            admin: {
              name: admin.name,
              profileUrl: `${this.environment.clientUrl}/player/${admin.id}`,
              avatarUrl: admin.avatar?.small,
            },
            client: {
              name: new URL(this.environment.clientUrl).hostname,
              iconUrl: `${this.environment.clientUrl}/${iconUrlPath}`,
            },
            changes,
          }),
        ),
      )
      .subscribe((embed) => this.notifications.next(embed));

    this.events.playerBanAdded
      .pipe(
        concatMap(({ ban }) =>
          Promise.all([
            ban,
            this.playersService.getById(ban.admin),
            this.playersService.getById(ban.player),
          ]),
        ),
        map(([ban, admin, player]) =>
          playerBanAdded({
            admin: {
              name: admin.name,
              profileUrl: `${this.environment.clientUrl}/player/${admin.id}`,
              avatarUrl: admin.avatar?.small,
            },
            player: {
              name: player.name,
              profileUrl: `${this.environment.clientUrl}/player/${player.id}`,
              avatarUrl: player.avatar?.medium,
            },
            client: {
              name: new URL(this.environment.clientUrl).hostname,
              iconUrl: `${this.environment.clientUrl}/${iconUrlPath}`,
            },
            reason: ban.reason,
            ends: ban.end,
          }),
        ),
      )
      .subscribe((embed) => this.notifications.next(embed));

    this.events.playerBanRevoked
      .pipe(
        filter(({ adminId }) => Boolean(adminId)),
        concatMap(({ ban, adminId }) =>
          from(
            Promise.all([
              ban,
              this.playersService.getById(adminId!),
              this.playersService.getById(ban.player),
            ]),
          ),
        ),
        map(([ban, admin, player]) =>
          playerBanRevoked({
            admin: {
              name: admin.name,
              profileUrl: `${this.environment.clientUrl}/player/${admin.id}`,
              avatarUrl: admin.avatar?.small,
            },
            player: {
              name: player.name,
              profileUrl: `${this.environment.clientUrl}/player/${player.id}`,
              avatarUrl: player.avatar?.medium,
            },
            client: {
              name: new URL(this.environment.clientUrl).hostname,
              iconUrl: `${this.environment.clientUrl}/${iconUrlPath}`,
            },
            reason: ban.reason,
          }),
        ),
      )
      .subscribe((embed) => this.notifications.next(embed));

    this.events.playerUpdates
      .pipe(
        filter(({ adminId }) => Boolean(adminId)),
        filter(
          ({ oldPlayer, newPlayer }) =>
            !isEqual(oldPlayer.skill, newPlayer.skill),
        ),
        concatMap(({ oldPlayer, newPlayer, adminId }) =>
          from(
            Promise.all([
              oldPlayer,
              newPlayer,
              this.playersService.getById(adminId!),
            ]),
          ),
        ),
        map(([oldPlayer, newPlayer, admin]) =>
          playerSkillChanged({
            admin: {
              name: admin.name,
              profileUrl: `${this.environment.clientUrl}/player/${admin.id}`,
              avatarUrl: admin.avatar?.small,
            },
            player: {
              name: newPlayer.name,
              profileUrl: `${this.environment.clientUrl}/player/${newPlayer.id}`,
              avatarUrl: newPlayer.avatar?.medium,
            },
            client: {
              name: new URL(this.environment.clientUrl).hostname,
              iconUrl: `${this.environment.clientUrl}/${iconUrlPath}`,
            },
            oldSkill: oldPlayer.skill ?? new Map(),
            newSkill: newPlayer.skill,
          }),
        ),
      )
      .subscribe((embed) => this.notifications.next(embed));

    this.staticGameServersService.gameServerAdded
      .pipe(
        map((gameServer) =>
          gameServerAdded({
            gameServer,
            client: {
              name: new URL(this.environment.clientUrl).hostname,
              iconUrl: `${this.environment.clientUrl}/${iconUrlPath}`,
            },
          }),
        ),
      )
      .subscribe((embed) => this.notifications.next(embed));

    this.staticGameServersService.gameServerUpdated
      .pipe(
        filter(
          ({ oldGameServer, newGameServer }) =>
            oldGameServer.isOnline === true && newGameServer.isOnline === false,
        ),
        map(({ newGameServer }) => newGameServer),
        map((gameServer) =>
          gameServerOffline({
            gameServer,
            client: {
              name: new URL(this.environment.clientUrl).hostname,
              iconUrl: `${this.environment.clientUrl}/${iconUrlPath}`,
            },
          }),
        ),
      )
      .subscribe((embed) => this.notifications.next(embed));

    this.staticGameServersService.gameServerUpdated
      .pipe(
        filter(
          ({ oldGameServer, newGameServer }) =>
            oldGameServer.isOnline === false && newGameServer.isOnline === true,
        ),
        map(({ newGameServer }) => newGameServer),
        map((gameServer) =>
          gameServerOnline({
            gameServer,
            client: {
              name: new URL(this.environment.clientUrl).hostname,
              iconUrl: `${this.environment.clientUrl}/${iconUrlPath}`,
            },
          }),
        ),
      )
      .subscribe((embed) => this.notifications.next(embed));

    this.events.gameChanges
      .pipe(
        filter(({ adminId }) => Boolean(adminId)),
        filter(({ oldGame, newGame }) => oldGame.state !== newGame.state),
        filter(({ newGame }) => newGame.state === GameState.interrupted),
        concatMap(({ newGame, adminId }) =>
          from(Promise.all([newGame, this.playersService.getById(adminId!)])),
        ),
        map(([game, admin]) =>
          gameForceEnded({
            admin: {
              name: admin.name,
              profileUrl: `${this.environment.clientUrl}/player/${admin.id}`,
              avatarUrl: admin.avatar?.small,
            },
            client: {
              name: new URL(this.environment.clientUrl).hostname,
              iconUrl: `${this.environment.clientUrl}/${iconUrlPath}`,
            },
            game: {
              number: `${game.number}`,
              url: `${this.environment.clientUrl}/game/${game.id}`,
            },
          }),
        ),
      )
      .subscribe((embed) => this.notifications.next(embed));

    this.events.substituteRequested
      .pipe(
        filter(({ adminId }) => Boolean(adminId)),
        concatMap(({ gameId, playerId, adminId }) =>
          from(
            Promise.all([
              this.gamesService.getById(gameId),
              this.playersService.getById(playerId),
              this.playersService.getById(adminId!),
            ]),
          ),
        ),
        map(([game, player, admin]) =>
          substituteRequested({
            player: {
              name: player.name,
              profileUrl: `${this.environment.clientUrl}/player/${player.id}`,
            },
            admin: {
              name: admin.name,
              profileUrl: `${this.environment.clientUrl}/player/${admin.id}`,
              avatarUrl: admin.avatar?.small,
            },
            game: {
              number: `${game.number}`,
              url: `${this.environment.clientUrl}/game/${game.id}`,
            },
            client: {
              name: new URL(this.environment.clientUrl).hostname,
              iconUrl: `${this.environment.clientUrl}/${iconUrlPath}`,
            },
          }),
        ),
      )
      .subscribe((embed) => this.notifications.next(embed));

    this.events.mapsScrambled
      .pipe(
        filter(({ actorId }) => Boolean(actorId)),
        map(({ actorId }) => actorId!),
        concatMap((actorId) => from(this.playersService.getById(actorId))),
        map((actor) =>
          mapsScrambled({
            actor: {
              name: actor.name,
              profileUrl: `${this.environment.clientUrl}/player/${actor.id}`,
              avatarUrl: actor.avatar?.small,
            },
            client: {
              name: new URL(this.environment.clientUrl).hostname,
              iconUrl: `${this.environment.clientUrl}/${iconUrlPath}`,
            },
          }),
        ),
      )
      .subscribe((embed) => this.notifications.next(embed));
  }

  private async getAdminChannels() {
    const config =
      await this.configurationService.get<GuildConfiguration[]>(
        'discord.guilds',
      );

    return config
      .map((config) => config.adminNotifications?.channel)
      .filter((channelId) => Boolean(channelId))
      .map((channelId) => this.client.channels.resolve(channelId!))
      .flatMap((channel) => (channel?.isTextBased() ? [channel] : []));
  }
}
