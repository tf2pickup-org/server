import { Environment } from '@/environment/environment';
import { Events } from '@/events/events';
import { Game } from '@/games/models/game';
import { GameState } from '@/games/models/game-state';
import { Player } from '@/players/models/player';
import { PlayerBan } from '@/players/models/player-ban';
import { PlayersService } from '@/players/services/players.service';
import { iconUrlPath } from '@configs/discord';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { filter, map } from 'rxjs/operators';
import {
  newPlayer,
  playerBanAdded,
  playerBanRevoked,
  playerSkillChanged,
  playerProfileUpdated,
  gameServerAdded,
  gameServerOffline,
  gameForceEnded,
  gameServerOnline,
} from '../notifications';
import { DiscordService } from './discord.service';
import { URL } from 'url';
import { substituteRequested } from '../notifications/substitute-requested';
import { GamesService } from '@/games/services/games.service';
import { StaticGameServer } from '@/game-servers/providers/static-game-server/models/static-game-server';
import { StaticGameServersService } from '@/game-servers/providers/static-game-server/services/static-game-servers.service';
import { mapsScrambled } from '../notifications/maps-scrambled';
import { isEqual } from 'lodash';
import { PlayerChanges } from '../player-changes';
import { extractPlayerChanges } from '../utils/extract-player-changes';

type PlayerSkillType = Player['skill'];

@Injectable()
export class AdminNotificationsService implements OnModuleInit {
  constructor(
    private discordService: DiscordService,
    private events: Events,
    private environment: Environment,
    private playersService: PlayersService,
    private gamesService: GamesService,
    private readonly staticGameServersService: StaticGameServersService,
  ) {}

  onModuleInit() {
    this.events.playerRegisters.subscribe(({ player }) =>
      this.onPlayerRegisters(player),
    );
    this.events.playerUpdates
      .pipe(
        map(({ oldPlayer, newPlayer, adminId }) => ({
          oldPlayer,
          newPlayer,
          adminId,
          changes: extractPlayerChanges(oldPlayer, newPlayer),
        })),
        filter(({ changes }) => Object.keys(changes).length > 0),
      )
      .subscribe(({ newPlayer, changes, adminId }) =>
        this.onPlayerUpdates(newPlayer, changes, adminId),
      );
    this.events.playerBanAdded.subscribe(({ ban }) =>
      this.onPlayerBanAdded(ban),
    );
    this.events.playerBanRevoked.subscribe(({ ban, adminId }) =>
      this.onPlayerBanRevoked(ban, adminId),
    );
    this.events.playerUpdates
      .pipe(
        filter(
          ({ oldPlayer, newPlayer }) =>
            !isEqual(oldPlayer.skill, newPlayer.skill),
        ),
      )
      .subscribe(({ oldPlayer, newPlayer, adminId }) =>
        this.onPlayerSkillChanged(
          newPlayer.id,
          oldPlayer.skill,
          newPlayer.skill,
          adminId,
        ),
      );
    this.staticGameServersService.gameServerAdded.subscribe((gameServer) =>
      this.onGameServerAdded(gameServer),
    );
    this.staticGameServersService.gameServerUpdated
      .pipe(
        filter(
          ({ oldGameServer, newGameServer }) =>
            oldGameServer.isOnline === true && newGameServer.isOnline === false,
        ),
      )
      .subscribe(({ newGameServer }) =>
        this.onGameServerWentOffline(newGameServer),
      );
    this.staticGameServersService.gameServerUpdated
      .pipe(
        filter(
          ({ oldGameServer, newGameServer }) =>
            oldGameServer.isOnline === false && newGameServer.isOnline === true,
        ),
      )
      .subscribe(({ newGameServer }) =>
        this.onGameServerBackOnline(newGameServer),
      );

    this.events.gameChanges
      .pipe(
        filter(({ oldGame, newGame }) => oldGame.state !== newGame.state),
        filter(({ newGame }) => newGame.state === GameState.interrupted),
      )
      .subscribe(({ newGame, adminId }) =>
        this.onGameForceEnded(newGame, adminId),
      );

    this.events.substituteRequested
      .pipe(filter(({ adminId }) => Boolean(adminId)))
      .subscribe(({ gameId, playerId, adminId }) =>
        this.onSubstituteRequested(gameId, playerId, adminId),
      );

    this.events.mapsScrambled
      .pipe(filter(({ actorId }) => Boolean(actorId)))
      .subscribe(({ actorId }) => this.onMapsScrambled(actorId));
  }

  private onPlayerRegisters(player: Player) {
    this.discordService.getAdminsChannel()?.send({
      embeds: [
        newPlayer({
          name: player.name,
          profileUrl: `${this.environment.clientUrl}/player/${player.id}`,
        }),
      ],
    });
  }

  private async onPlayerUpdates(
    player: Player,
    changes: PlayerChanges,
    adminId?: string,
  ) {
    if (!adminId) {
      return;
    }

    const admin = await this.playersService.getById(adminId);

    if (Object.keys(changes).length === 0) {
      return; // skip empty notification
    }

    this.discordService.getAdminsChannel()?.send({
      embeds: [
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
      ],
    });
  }

  private async onPlayerBanAdded(ban: PlayerBan) {
    const admin = await this.playersService.getById(ban.admin);
    const player = await this.playersService.getById(ban.player);

    this.discordService.getAdminsChannel()?.send({
      embeds: [
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
      ],
    });
  }

  private async onPlayerBanRevoked(ban: PlayerBan, adminId?: string) {
    if (!adminId) {
      return;
    }

    const admin = await this.playersService.getById(adminId);
    const player = await this.playersService.getById(ban.player);

    this.discordService.getAdminsChannel()?.send({
      embeds: [
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
      ],
    });
  }

  private async onPlayerSkillChanged(
    playerId: string,
    oldSkill: PlayerSkillType,
    newSkill: PlayerSkillType,
    adminId?: string,
  ) {
    if (!adminId) {
      return;
    }

    const player = await this.playersService.getById(playerId);
    const admin = await this.playersService.getById(adminId);

    this.discordService.getAdminsChannel()?.send({
      embeds: [
        playerSkillChanged({
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
          oldSkill: oldSkill ?? new Map(),
          newSkill,
        }),
      ],
    });
  }

  private onGameServerAdded(gameServer: StaticGameServer) {
    this.discordService.getAdminsChannel()?.send({
      embeds: [
        gameServerAdded({
          gameServer,
          client: {
            name: new URL(this.environment.clientUrl).hostname,
            iconUrl: `${this.environment.clientUrl}/${iconUrlPath}`,
          },
        }),
      ],
    });
  }

  private onGameServerWentOffline(gameServer: StaticGameServer) {
    this.discordService.getAdminsChannel()?.send({
      embeds: [
        gameServerOffline({
          gameServer,
          client: {
            name: new URL(this.environment.clientUrl).hostname,
            iconUrl: `${this.environment.clientUrl}/${iconUrlPath}`,
          },
        }),
      ],
    });
  }

  private onGameServerBackOnline(gameServer: StaticGameServer) {
    this.discordService.getAdminsChannel()?.send({
      embeds: [
        gameServerOnline({
          gameServer,
          client: {
            name: new URL(this.environment.clientUrl).hostname,
            iconUrl: `${this.environment.clientUrl}/${iconUrlPath}`,
          },
        }),
      ],
    });
  }

  private async onGameForceEnded(game: Game, adminId?: string) {
    if (!adminId) {
      return;
    }

    const admin = await this.playersService.getById(adminId);
    this.discordService.getAdminsChannel()?.send({
      embeds: [
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
      ],
    });
  }

  private async onSubstituteRequested(
    gameId: string,
    playerId: string,
    adminId?: string,
  ) {
    if (!adminId) {
      return;
    }

    const admin = await this.playersService.getById(adminId);
    const player = await this.playersService.getById(playerId);
    const game = await this.gamesService.getById(gameId);

    this.discordService.getAdminsChannel()?.send({
      embeds: [
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
      ],
    });
  }

  private async onMapsScrambled(actorId?: string) {
    if (!actorId) {
      return;
    }

    const actor = await this.playersService.getById(actorId);
    this.discordService.getAdminsChannel()?.send({
      embeds: [
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
      ],
    });
  }
}
