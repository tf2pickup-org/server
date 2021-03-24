import { Environment } from '@/environment/environment';
import { Events } from '@/events/events';
import { GameServer } from '@/game-servers/models/game-server';
import { Player } from '@/players/models/player';
import { PlayerBan } from '@/players/models/player-ban';
import { PlayerSkillType } from '@/players/services/player-skill.service';
import { PlayersService } from '@/players/services/players.service';
import { iconUrlPath } from '@configs/discord';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { isRefType } from '@typegoose/typegoose';
import { newPlayer, playerBanAdded, playerBanRevoked, playerSkillChanged, playerProfileUpdated, gameServerAdded, gameServerRemoved } from '../notifications';
import { DiscordService } from './discord.service';

const playerSkillEqual = (oldSkill: PlayerSkillType, newSkill: PlayerSkillType) => {
  if (oldSkill.size !== newSkill.size) {
    return false;
  }

  for (const [key, value] of oldSkill) {
    const currentSkill = newSkill.get(key);
    if (currentSkill !== value || (currentSkill === undefined && !newSkill.has(key))) {
      return false;
    }
  }

  return true;
}

@Injectable()
export class AdminNotificationsService implements OnModuleInit {

  constructor(
    private discordService: DiscordService,
    private events: Events,
    private environment: Environment,
    private playersService: PlayersService,
  ) { }

  onModuleInit() {
    this.events.playerRegisters.subscribe(({ player }) => this.onPlayerRegisters(player));
    this.events.playerUpdates.subscribe(({ oldPlayer, newPlayer, adminId }) => this.onPlayerUpdates(oldPlayer, newPlayer, adminId));
    this.events.playerBanAdded.subscribe(({ ban }) => this.onPlayerBanAdded(ban));
    this.events.playerBanRevoked.subscribe(({ ban }) => this.onPlayerBanRevoked(ban));
    this.events.playerSkillChanged.subscribe(({ playerId, oldSkill, newSkill, adminId }) =>
      this.onPlayerSkillChanged(playerId, oldSkill, newSkill, adminId));
    this.events.gameServerAdded.subscribe(({ gameServer, adminId }) => this.onGameServerAdded(gameServer, adminId));
    this.events.gameServerRemoved.subscribe(({ gameServer, adminId }) => this.onGameServerRemoved(gameServer, adminId));
  }

  private onPlayerRegisters(player: Player) {
    this.discordService.getAdminsChannel()?.send({
      embed: newPlayer({
        name: player.name,
        profileUrl: `${this.environment.clientUrl}/player/${player.id}`,
      }),
    });
  }

  private async onPlayerUpdates(oldPlayer: Player, newPlayer: Player, adminId: string) {
    if (!adminId) {
      return;
    }

    const admin = await this.playersService.getById(adminId);

    const changes: Record<string, { old: string, new: string }> = { };
    if (oldPlayer.name !== newPlayer.name) {
      changes.name = { old: oldPlayer.name, new: newPlayer.name };
    }
    if (oldPlayer.role !== newPlayer.role) {
      changes.role = { old: oldPlayer.role, new: newPlayer.role };
    }

    if (Object.keys(changes).length === 0) {
      return; // skip empty notification
    }

    this.discordService.getAdminsChannel()?.send({
      embed: playerProfileUpdated({
        player: {
          name: oldPlayer.name,
          profileUrl: `${this.environment.clientUrl}/player/${oldPlayer.id}`,
          avatarUrl: newPlayer.avatar?.medium,
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
    });
  }

  private async onPlayerBanAdded(ban: PlayerBan) {
    const admin = isRefType(ban.admin) ? await this.playersService.getById(ban.admin) : ban.admin;
    const player = isRefType(ban.player) ? await this.playersService.getById(ban.player) : ban.player;

    this.discordService.getAdminsChannel()?.send({
      embed: playerBanAdded({
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
    });
  }

  private async onPlayerBanRevoked(ban: PlayerBan) {
    const admin = isRefType(ban.admin) ? await this.playersService.getById(ban.admin) : ban.admin;
    const player = isRefType(ban.player) ? await this.playersService.getById(ban.player) : ban.player;

    this.discordService.getAdminsChannel()?.send({
      embed: playerBanRevoked({
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
    });
  }

  private async onPlayerSkillChanged(playerId: string, oldSkill: PlayerSkillType, newSkill: PlayerSkillType, adminId: string) {
    if (!adminId) {
      return;
    }

    if (playerSkillEqual(oldSkill, newSkill)) {
      return;
    }

    const player = await this.playersService.getById(playerId);
    const admin = await this.playersService.getById(adminId);

    this.discordService.getAdminsChannel()?.send({
      embed: playerSkillChanged({
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
        oldSkill,
        newSkill,
      }),
    });
  }

  private async onGameServerAdded(gameServer: GameServer, adminId: string) {
    if (!adminId) {
      return;
    }

    const admin = await this.playersService.getById(adminId);

    this.discordService.getAdminsChannel()?.send({
      embed: gameServerAdded({
        admin: {
          name: admin.name,
          profileUrl: `${this.environment.clientUrl}/player/${admin.id}`,
          avatarUrl: admin.avatar?.small,
        },
        gameServer,
        client: {
          name: new URL(this.environment.clientUrl).hostname,
          iconUrl: `${this.environment.clientUrl}/${iconUrlPath}`,
        },
      }),
    });
  }

  private async onGameServerRemoved(gameServer: GameServer, adminId: string) {
    if (!adminId) {
      return;
    }

    const admin = await this.playersService.getById(adminId);

    this.discordService.getAdminsChannel()?.send({
      embed: gameServerRemoved({
        admin: {
          name: admin.name,
          profileUrl: `${this.environment.clientUrl}/player/${admin.id}`,
          avatarUrl: admin.avatar?.small,
        },
        gameServer,
        client: {
          name: new URL(this.environment.clientUrl).hostname,
          iconUrl: `${this.environment.clientUrl}/${iconUrlPath}`,
        },
      }),
    });
  }

}
