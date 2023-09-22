import { Events } from '@/events/events';
import { GamesService } from '@/games/services/games.service';
import { PlayerSubstitutionService } from '@/games/services/player-substitution.service';
import { PlayerCooldownService } from '@/players/services/player-cooldown.service';
import { PlayersService } from '@/players/services/players.service';
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { isUndefined } from 'lodash';
import { filter, take, takeUntil } from 'rxjs';

@Injectable()
export class PlayerBehaviorHandlerService {
  private logger = new Logger(PlayerBehaviorHandlerService.name);

  constructor(
    private readonly gamesService: GamesService,
    private readonly playerSubstitutionService: PlayerSubstitutionService,
    private readonly playersService: PlayersService,
    private readonly playerCooldownService: PlayerCooldownService,
    private readonly events: Events,
  ) {}

  @Cron(CronExpression.EVERY_10_SECONDS)
  async autoSubstitutePlayers() {
    try {
      const bot = await this.playersService.findBot();
      const gamesLive = await this.gamesService.getRunningGames();
      for (const game of gamesLive) {
        for (const slot of game.slots) {
          const timeout =
            await this.gamesService.calculatePlayerJoinGameServerTimeout(
              game._id,
              slot.player,
            );

          if (isUndefined(timeout)) {
            continue;
          }

          if (timeout < new Date().getTime()) {
            const player = await this.playersService.getById(slot.player);
            this.logger.debug(
              `[${player.name}] now=${new Date().getTime()} timeout=${timeout}`,
            );
            this.logger.log(
              `player ${player.name} is offline; requesting substitute`,
            );

            await this.playerSubstitutionService.substitutePlayer(
              game._id,
              player._id,
              bot._id,
              'Player is offline',
            );

            const gameEnds = this.events.gameChanges.pipe(
              filter(({ newGame }) => newGame._id.equals(game._id)),
              filter(
                ({ oldGame, newGame }) =>
                  oldGame.isInProgress() && !newGame.isInProgress(),
              ),
            );

            // Apply cooldown to the player if they get replaced by someone else.
            // They still can take their own spot and not receive a ban.
            this.events.playerReplaced
              .pipe(
                takeUntil(gameEnds),
                filter(({ gameId }) => gameId.equals(game._id)),
                filter(({ replaceeId }) => replaceeId.equals(player._id)),
                take(1),
              )
              .subscribe(async ({ replaceeId, replacementId }) => {
                if (!replaceeId.equals(replacementId)) {
                  await this.playerCooldownService.applyCooldown(player._id);
                }
              });
          }
        }
      }
    } catch (error) {
      this.logger.error(error);
    }
  }
}
