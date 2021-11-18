import { GameServersService } from '@/game-servers/services/game-servers.service';
import { serverCleanupDelay } from '@configs/game-servers';
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { GamesService } from './games.service';
import { ServerConfiguratorService } from './server-configurator.service';

@Injectable()
export class GameServerCleanUpService {
  private logger = new Logger(GameServerCleanUpService.name);

  constructor(
    private gamesService: GamesService,
    private gameServersService: GameServersService,
    private serverConfiguratorService: ServerConfiguratorService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async cleanupUnusedGameServers() {
    const gameServers = await this.gameServersService.getAllGameServers();
    for (const gameServer of gameServers) {
      if (gameServer.game) {
        const game = await this.gamesService.getById(gameServer.game);
        if (
          !game.isInProgress() &&
          game.endedAt.getTime() < Date.now() - serverCleanupDelay
        ) {
          this.logger.log(
            `cleaning up game server ${gameServer.id} (${gameServer.name})`,
          );

          try {
            await this.serverConfiguratorService.cleanupServer(gameServer.id);
          } catch (e) {
            this.logger.error(e.message);
          } finally {
            await this.gameServersService.releaseServer(gameServer.id);
          }
        }
      }
    }
  }
}
