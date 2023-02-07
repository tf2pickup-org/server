import { ConfigurationService } from '@/configuration/services/configuration.service';
import { GameState } from '@/games/models/game-state';
import { PlayerConnectionStatus } from '@/games/models/player-connection-status';
import { PlayerEventType } from '@/games/models/player-event';
import { GamesService } from '@/games/services/games.service';
import { PlayerSubstitutionService } from '@/games/services/player-substitution.service';
import { PlayersService } from '@/players/services/players.service';
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class PlayerBehaviorHandlerService {
  private logger = new Logger(PlayerBehaviorHandlerService.name);

  constructor(
    private readonly gamesService: GamesService,
    private readonly playerSubstitutionService: PlayerSubstitutionService,
    private readonly playersService: PlayersService,
    private readonly configurationService: ConfigurationService,
  ) {}

  @Cron(CronExpression.EVERY_30_SECONDS)
  async verifyPlayersJoinedGameServer() {
    const bot = await this.playersService.findBot();
    const timeout = await this.configurationService.get<number>(
      'games.join_gameserver_timeout',
    );
    const gamesLive = await this.gamesService.getRunningGames();
    await Promise.all(
      gamesLive
        .filter((game) => game.state === GameState.launching)
        .filter((game) => Boolean(game.lastConfiguredAt))
        .filter(
          (game) => game.lastConfiguredAt!.getTime() + timeout < Date.now(),
        )
        .map(async (game) => {
          return await Promise.all(
            game
              .activeSlots()
              .filter(
                (slot) =>
                  slot.connectionStatus === PlayerConnectionStatus.offline,
              )
              .map(async (slot) => {
                this.logger.log(
                  `player ${slot.player} has not joined the game on time; requesting substitute`,
                );
                return await this.playerSubstitutionService.substitutePlayer(
                  game._id,
                  slot.player,
                  bot._id,
                );
              }),
          );
        }),
    );
  }

  @Cron(CronExpression.EVERY_30_SECONDS)
  async verifyPlayersRejoinedGameServer() {
    const bot = await this.playersService.findBot();
    const timeout = await this.configurationService.get<number>(
      'games.rejoin_gameserver_timeout',
    );
    const gamesLive = await this.gamesService.getRunningGames();
    for (const game of gamesLive) {
      if (game.state !== GameState.started) {
        continue;
      }

      for (const slot of game.slots) {
        if (slot.connectionStatus !== PlayerConnectionStatus.offline) {
          continue;
        }

        const disconnectedAt = slot.events
          .filter((e) => e.event === PlayerEventType.leavesGameServer)
          .sort((a, b) => b.at.getTime() - a.at.getTime())[0]?.at;

        if (disconnectedAt && disconnectedAt.getTime() + timeout < Date.now()) {
          this.logger.log(
            `player ${slot.player} disconnected; requesting substitute`,
          );
          await this.playerSubstitutionService.substitutePlayer(
            game._id,
            slot.player,
            bot._id,
          );
        }
      }
    }
  }
}
