import { ConfigurationService } from '@/configuration/services/configuration.service';
import { PlayerBansService } from '@/players/services/player-bans.service';
import { PlayersService } from '@/players/services/players.service';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { PlayerDeniedError } from '../errors/player-denied.error';

@Injectable()
export class CanJoinQueueGuard implements CanActivate {
  constructor(
    private readonly playersService: PlayersService,
    private readonly configurationService: ConfigurationService,
    private readonly playerBansService: PlayerBansService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const player = (context.switchToWs().getClient() as Socket).user;
    if (!player) {
      throw new WsException('not logged in');
    }

    if (!player.hasAcceptedRules) {
      throw new PlayerDeniedError(player, 'player has not accepted rules');
    }

    if (
      !player.skill &&
      (await this.configurationService.getDenyPlayersWithNoSkillAssigned())
        .value
    ) {
      throw new PlayerDeniedError(player, 'no skill assigned');
    }

    const bans = await this.playerBansService.getPlayerActiveBans(player.id);
    if (bans.length > 0) {
      throw new PlayerDeniedError(player, 'player is banned');
    }

    if (player.activeGame) {
      throw new PlayerDeniedError(player, 'player is involved in a game');
    }

    return true;
  }
}
