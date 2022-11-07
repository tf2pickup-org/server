import { ConfigurationService } from '@/configuration/services/configuration.service';
import { PlayerBansService } from '@/players/services/player-bans.service';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { DenyReason, PlayerDeniedError } from '../errors/player-denied.error';

@Injectable()
export class CanJoinQueueGuard implements CanActivate {
  constructor(
    private readonly configurationService: ConfigurationService,
    private readonly playerBansService: PlayerBansService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const player = (context.switchToWs().getClient() as Socket).user;
    if (!player) {
      throw new WsException('not logged in');
    }

    if (!player.hasAcceptedRules) {
      throw new PlayerDeniedError(player, DenyReason.playerHasNotAcceptedRules);
    }

    if (
      !player.skill &&
      (await this.configurationService.getDenyPlayersWithNoSkillAssigned())
        .value
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
