import { ConfigurationService } from '@/configuration/services/configuration.service';
import { PlayerBansService } from '@/players/services/player-bans.service';
import { PlayersService } from '@/players/services/players.service';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { DenyReason, PlayerDeniedError } from '../errors/player-denied.error';

@Injectable()
export class CanJoinQueueGuard implements CanActivate {
  constructor(
    private readonly configurationService: ConfigurationService,
    private readonly playerBansService: PlayerBansService,
    private readonly playersService: PlayersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const socket = context.switchToWs().getClient<Socket>();
    if (!socket.user) {
      throw new WsException('not logged in');
    }

    const player = await this.playersService.getById(socket.user.id);
    if (!player.hasAcceptedRules) {
      throw new PlayerDeniedError(player, DenyReason.playerHasNotAcceptedRules);
    }

    if (
      !player.skill &&
      (await this.configurationService.get<boolean>(
        'queue.deny_players_with_no_skill_assigned',
      ))
    ) {
      throw new PlayerDeniedError(player, DenyReason.noSkillAssigned);
    }

    const bans = await this.playerBansService.getPlayerActiveBans(player.id);
    if (bans.length > 0) {
      throw new PlayerDeniedError(player, DenyReason.playerIsBanned);
    }

    if (player.activeGame) {
      throw new PlayerDeniedError(player, DenyReason.playerIsInvolvedInGame);
    }

    return true;
  }
}
