import { ConfigurationService } from '@/configuration/services/configuration.service';
import { PlayerBansService } from '@/players/services/player-bans.service';
import { PlayersService } from '@/players/services/players.service';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import {
  DenyReason,
  PlayerDeniedError,
} from '../../shared/errors/player-denied.error';
import { QueueService } from '../services/queue.service';
import { NoSuchSlotError } from '../errors/no-such-slot.error';
import { isUndefined } from 'lodash';

@Injectable()
export class CanJoinQueueGuard implements CanActivate {
  constructor(
    private readonly configurationService: ConfigurationService,
    private readonly playerBansService: PlayerBansService,
    private readonly playersService: PlayersService,
    private readonly queueService: QueueService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const socket = context.switchToWs().getClient<Socket>();
    if (!socket.user) {
      throw new WsException('not logged in');
    }

    const player = await this.playersService.getById(socket.user._id);
    if (!player.hasAcceptedRules) {
      throw new PlayerDeniedError(player, DenyReason.playerHasNotAcceptedRules);
    }

    const bans = await this.playerBansService.getPlayerActiveBans(player._id);
    if (bans.length > 0) {
      throw new PlayerDeniedError(player, DenyReason.playerIsBanned);
    }

    if (player.activeGame) {
      throw new PlayerDeniedError(player, DenyReason.playerIsInvolvedInGame);
    }

    if (
      !player.skill &&
      (await this.configurationService.get<boolean>(
        'queue.deny_players_with_no_skill_assigned',
      ))
    ) {
      throw new PlayerDeniedError(player, DenyReason.noSkillAssigned);
    }

    const payload = context.getArgByIndex<{ slotId: number }>(1);
    const slot = this.queueService.getSlotById(payload.slotId);

    if (!slot) {
      throw new NoSuchSlotError(payload.slotId);
    }

    if (player.skill) {
      const threshold = await this.configurationService.get<number>(
        'queue.player_skill_threshold',
      );

      const skill = player.skill.get(slot.gameClass);
      if (!isUndefined(skill) && skill < threshold) {
        throw new PlayerDeniedError(
          player,
          DenyReason.playerSkillBelowThreshold,
        );
      }
    }

    return true;
  }
}
