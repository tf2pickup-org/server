import { ConfigurationService } from '@/configuration/services/configuration.service';
import { CooldownLevel } from '@/games/types/cooldown-level';
import { Injectable, Logger } from '@nestjs/common';
import { PlayerId } from '../types/player-id';
import { PlayerBansService } from './player-bans.service';
import { PlayersService } from './players.service';

@Injectable()
export class PlayerCooldownService {
  private readonly logger = new Logger(PlayerCooldownService.name);

  constructor(
    private readonly playersService: PlayersService,
    private readonly configurationService: ConfigurationService,
    private readonly playerBansService: PlayerBansService,
  ) {}

  async applyCooldown(playerId: PlayerId) {
    const cooldownLevels = await this.configurationService.get<CooldownLevel[]>(
      'games.cooldown_levels',
    );
    if (cooldownLevels.length === 0) {
      // cooldowns disabled
      return;
    }

    const player = await this.playersService.getById(playerId);
    this.logger.debug(
      `attempt to apply cooldown to player ${player.name} (cooldown level=${player.cooldownLevel})`,
    );

    let cooldown = cooldownLevels.find(
      (cl) => cl.level === player.cooldownLevel,
    );
    if (!cooldown) {
      cooldown = cooldownLevels.at(-1);
    }

    const bot = await this.playersService.findBot();

    await this.playerBansService.addPlayerBan({
      player: player._id,
      admin: bot._id,
      start: new Date(),
      end: new Date(Date.now() + cooldown!.banLengthMs),
      reason: `Cooldown level ${player.cooldownLevel}`,
    });

    await this.playersService.updatePlayer(playerId, {
      $inc: {
        cooldownLevel: 1,
      },
    });
  }
}
